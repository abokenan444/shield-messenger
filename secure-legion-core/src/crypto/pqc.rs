/// Post-Quantum Cryptography — Hybrid X25519 + ML-KEM-1024 (NIST FIPS 203)
///
/// Provides quantum-resistant key encapsulation combined with classical X25519 ECDH.
/// The hybrid approach ensures security even if one algorithm is broken.
///
/// Migrated from `pqc_kyber` to the official `ml-kem` crate (RustCrypto, FIPS 203 final).
///
/// Key sizes (ML-KEM-1024):
/// - Encapsulation key (public):  1568 bytes
/// - Decapsulation key (secret):  3168 bytes
/// - Ciphertext:                  1568 bytes
/// - Shared secret:               32 bytes
/// - X25519 public:               32 bytes
/// - X25519 secret:               32 bytes
/// - Combined secret:             64 bytes (BLAKE3-KDF(X25519 ‖ ML-KEM))
use ml_kem::kem::{Decapsulate, Encapsulate};
use ml_kem::{Encoded, EncodedSizeUser, KemCore, MlKem1024, MlKem1024Params};
use rand::rngs::OsRng;
use rand::{RngCore, SeedableRng};
use rand_chacha::ChaCha20Rng;
use thiserror::Error;
use x25519_dalek::{PublicKey, StaticSecret};
use zeroize::Zeroize;

use crate::crypto::key_exchange;

/// ML-KEM-1024 encapsulation key (public) size in bytes
pub const MLKEM1024_EK_BYTES: usize = 1568;
/// ML-KEM-1024 ciphertext size in bytes
pub const MLKEM1024_CT_BYTES: usize = 1568;
/// ML-KEM-1024 decapsulation key (secret) size in bytes
pub const MLKEM1024_DK_BYTES: usize = 3168;

// Backward-compatible aliases so downstream code (pq_ratchet, FFI) keeps compiling.
pub const KYBER1024_PK_BYTES: usize = MLKEM1024_EK_BYTES;
pub const KYBER1024_CT_BYTES: usize = MLKEM1024_CT_BYTES;
pub const KYBER1024_SK_BYTES: usize = MLKEM1024_DK_BYTES;

#[derive(Error, Debug)]
pub enum PqcError {
    #[error("ML-KEM key generation failed")]
    KeyGenFailed,
    #[error("ML-KEM encapsulation failed")]
    EncapsulateFailed,
    #[error("ML-KEM decapsulation failed")]
    DecapsulateFailed,
    #[error("Invalid key length")]
    InvalidKeyLength,
    #[error("Invalid public key")]
    InvalidPublicKey,
    #[error("X25519 key exchange failed: {0}")]
    X25519Error(String),
}

pub type Result<T> = std::result::Result<T, PqcError>;

/// Hybrid KEM keypair: X25519 + ML-KEM-1024
#[derive(Clone)]
pub struct HybridKEMKeypair {
    /// X25519 public key (32 bytes)
    pub x25519_public: [u8; 32],
    /// X25519 secret key (32 bytes)
    pub x25519_secret: [u8; 32],
    /// ML-KEM-1024 encapsulation key / public key (1568 bytes)
    pub kyber_public: Vec<u8>,
    /// ML-KEM-1024 decapsulation key / secret key (3168 bytes)
    pub kyber_secret: Vec<u8>,
}

impl Drop for HybridKEMKeypair {
    fn drop(&mut self) {
        self.x25519_secret.zeroize();
        self.kyber_secret.zeroize();
    }
}

/// Hybrid ciphertext from encapsulation
#[derive(Clone, Debug)]
pub struct HybridCiphertext {
    /// X25519 ephemeral public key (32 bytes)
    pub x25519_ephemeral_public: [u8; 32],
    /// ML-KEM-1024 ciphertext (1568 bytes)
    pub kyber_ciphertext: Vec<u8>,
    /// Combined shared secret: BLAKE3-KDF(X25519_ss ‖ ML-KEM_ss) → 64 bytes
    pub shared_secret: Vec<u8>,
}

/// Combine two 32-byte shared secrets into a single 64-byte key via BLAKE3-KDF
fn combine_shared_secrets(x25519_ss: &[u8; 32], mlkem_ss: &[u8]) -> Vec<u8> {
    let mut input = Vec::with_capacity(64);
    input.extend_from_slice(x25519_ss);
    input.extend_from_slice(mlkem_ss);

    let kdf = blake3::derive_key("ShieldMessenger-HybridKEM-X25519-Kyber1024-v1", &input);
    let mut combined = Vec::with_capacity(64);
    combined.extend_from_slice(&kdf);
    let kdf2 = blake3::derive_key(
        "ShieldMessenger-HybridKEM-X25519-Kyber1024-v1-expand",
        &input,
    );
    combined.extend_from_slice(&kdf2);
    combined
}

/// Generate a hybrid keypair from a 32-byte seed (deterministic)
pub fn generate_hybrid_keypair_from_seed(seed: &[u8; 32]) -> Result<HybridKEMKeypair> {
    let mut rng = ChaCha20Rng::from_seed(*seed);

    // Generate X25519 keypair deterministically
    let mut x25519_seed = [0u8; 32];
    rng.fill_bytes(&mut x25519_seed);
    let x25519_secret_key = StaticSecret::from(x25519_seed);
    let x25519_public_key = PublicKey::from(&x25519_secret_key);

    // Generate ML-KEM-1024 keypair via the official FIPS 203 crate
    let (dk, ek) = MlKem1024::generate(&mut rng);
    let ek_bytes = ek.as_bytes().to_vec();
    let dk_bytes = dk.as_bytes().to_vec();

    Ok(HybridKEMKeypair {
        x25519_public: x25519_public_key.to_bytes(),
        x25519_secret: x25519_secret_key.to_bytes(),
        kyber_public: ek_bytes,
        kyber_secret: dk_bytes,
    })
}

/// Generate a hybrid keypair with random keys
pub fn generate_hybrid_keypair_random() -> Result<HybridKEMKeypair> {
    let (x25519_public, x25519_secret) = key_exchange::generate_static_keypair();

    let (dk, ek) = MlKem1024::generate(&mut OsRng);
    let ek_bytes = ek.as_bytes().to_vec();
    let dk_bytes = dk.as_bytes().to_vec();

    Ok(HybridKEMKeypair {
        x25519_public,
        x25519_secret,
        kyber_public: ek_bytes,
        kyber_secret: dk_bytes,
    })
}

/// Hybrid encapsulation: generate shared secret + ciphertext
///
/// Combines X25519 ECDH with ML-KEM-1024 encapsulation.
/// The resulting shared secret is bound to both algorithms via BLAKE3-KDF.
pub fn hybrid_encapsulate(
    recipient_x25519_public: &[u8],
    recipient_mlkem_public: &[u8],
) -> Result<HybridCiphertext> {
    if recipient_x25519_public.len() != 32 {
        return Err(PqcError::InvalidKeyLength);
    }
    if recipient_mlkem_public.len() != MLKEM1024_EK_BYTES {
        return Err(PqcError::InvalidKeyLength);
    }

    // X25519 ephemeral key exchange
    let (eph_public, eph_secret) = key_exchange::generate_static_keypair();
    let x25519_shared = key_exchange::derive_shared_secret(&eph_secret, recipient_x25519_public)
        .map_err(|e| PqcError::X25519Error(e.to_string()))?;

    // Reconstruct ML-KEM-1024 EncapsulationKey from raw bytes
    let ek_encoded =
        Encoded::<ml_kem::kem::EncapsulationKey<MlKem1024Params>>::try_from(recipient_mlkem_public)
            .map_err(|_| PqcError::InvalidKeyLength)?;
    let ek = ml_kem::kem::EncapsulationKey::<MlKem1024Params>::from_bytes(&ek_encoded);

    // ML-KEM-1024 encapsulation
    let (ct, mlkem_ss) = ek
        .encapsulate(&mut OsRng)
        .map_err(|_| PqcError::EncapsulateFailed)?;

    // Combine shared secrets via BLAKE3-KDF
    let combined = combine_shared_secrets(&x25519_shared, mlkem_ss.as_ref());

    // Convert ciphertext to Vec<u8>
    let ct_bytes: Vec<u8> = ct.iter().copied().collect();

    Ok(HybridCiphertext {
        x25519_ephemeral_public: eph_public,
        kyber_ciphertext: ct_bytes,
        shared_secret: combined,
    })
}

/// Hybrid decapsulation: recover shared secret from ciphertext
pub fn hybrid_decapsulate(
    x25519_ephemeral_public: &[u8],
    mlkem_ciphertext: &[u8],
    our_x25519_secret: &[u8],
    our_mlkem_secret: &[u8],
) -> Result<Vec<u8>> {
    if x25519_ephemeral_public.len() != 32 || our_x25519_secret.len() != 32 {
        return Err(PqcError::InvalidKeyLength);
    }
    if mlkem_ciphertext.len() != MLKEM1024_CT_BYTES {
        return Err(PqcError::InvalidKeyLength);
    }
    if our_mlkem_secret.len() != MLKEM1024_DK_BYTES {
        return Err(PqcError::InvalidKeyLength);
    }

    // X25519 recover shared secret
    let x25519_shared =
        key_exchange::derive_shared_secret(our_x25519_secret, x25519_ephemeral_public)
            .map_err(|e| PqcError::X25519Error(e.to_string()))?;

    // Reconstruct ML-KEM-1024 DecapsulationKey from raw bytes
    let dk_encoded =
        Encoded::<ml_kem::kem::DecapsulationKey<MlKem1024Params>>::try_from(our_mlkem_secret)
            .map_err(|_| PqcError::InvalidKeyLength)?;
    let dk = ml_kem::kem::DecapsulationKey::<MlKem1024Params>::from_bytes(&dk_encoded);

    // Reconstruct ciphertext from raw bytes
    // ml_kem::Ciphertext<MlKem1024> is Array<u8, CiphertextSize>
    // We use Encoded<EncapsulationKey> trick won't work; instead use Ciphertext type alias
    let ct: ml_kem::Ciphertext<MlKem1024> =
        ml_kem::Ciphertext::<MlKem1024>::try_from(mlkem_ciphertext)
            .map_err(|_| PqcError::InvalidKeyLength)?;

    // ML-KEM-1024 decapsulation
    let mlkem_ss = dk
        .decapsulate(&ct)
        .map_err(|_| PqcError::DecapsulateFailed)?;

    // Combine via BLAKE3-KDF
    let combined = combine_shared_secrets(&x25519_shared, mlkem_ss.as_ref());

    Ok(combined)
}

/// Generate a Safety Number for contact verification
///
/// Creates a human-readable fingerprint from both parties' identity keys.
/// Displayed as 12 groups of 5 digits for easy comparison.
///
/// Uses `hash_bytes.get(offset..offset+4)` — idiomatic Rust that returns
/// `Option<&[u8]>`, falling back to wrapped byte extraction when the slice
/// crosses the hash boundary.
pub fn generate_safety_number(our_identity: &[u8], their_identity: &[u8]) -> String {
    let (first, second) = if our_identity <= their_identity {
        (our_identity, their_identity)
    } else {
        (their_identity, our_identity)
    };

    let mut hasher = blake3::Hasher::new_derive_key("ShieldMessenger-SafetyNumber-v1");
    hasher.update(first);
    hasher.update(second);
    let hash = hasher.finalize();
    let hash_bytes = hash.as_bytes(); // 32 bytes

    let mut digits = String::with_capacity(71);
    for i in 0..12 {
        if i > 0 {
            digits.push(' ');
        }
        let offset = (i * 5) % 32;
        let chunk = if let Some(slice) = hash_bytes.get(offset..offset + 4) {
            [slice[0], slice[1], slice[2], slice[3]]
        } else {
            // Offset near end of hash — wrap individual bytes
            [
                hash_bytes[offset % 32],
                hash_bytes[(offset + 1) % 32],
                hash_bytes[(offset + 2) % 32],
                hash_bytes[(offset + 3) % 32],
            ]
        };
        let num = u32::from_be_bytes(chunk) % 100_000;
        digits.push_str(&format!("{:05}", num));
    }
    digits
}

/// Verify a safety number matches expected value (constant-time comparison)
pub fn verify_safety_number(our_identity: &[u8], their_identity: &[u8], expected: &str) -> bool {
    let computed = generate_safety_number(our_identity, their_identity);
    use subtle::ConstantTimeEq;
    computed.as_bytes().ct_eq(expected.as_bytes()).into()
}

// ---------------------------------------------------------------------------
// Trust Levels — persistent verification state for contacts
// ---------------------------------------------------------------------------

/// Three-tier trust model for contact verification.
///
/// - `Untrusted` (Level 0): Brand-new contact, no encryption handshake yet.
/// - `Encrypted` (Level 1): E2EE established but identity NOT verified via QR.
/// - `Verified`  (Level 2): Identity verified via QR fingerprint scan.
///
/// This value MUST be persisted in the encrypted database (SQLCipher / IndexedDB)
/// so it survives app restarts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[repr(u8)]
pub enum TrustLevel {
    /// Level 0 — new contact, no encryption negotiated yet
    Untrusted = 0,
    /// Level 1 — encrypted channel established, fingerprint NOT verified
    Encrypted = 1,
    /// Level 2 — identity verified via QR safety-number scan
    Verified = 2,
}

impl TrustLevel {
    /// Deserialize from a stored integer value.
    pub fn from_u8(v: u8) -> Self {
        match v {
            0 => TrustLevel::Untrusted,
            1 => TrustLevel::Encrypted,
            2 => TrustLevel::Verified,
            _ => TrustLevel::Untrusted,
        }
    }

    /// A short human-readable label (English). The UI should use i18n keys instead.
    pub fn label(self) -> &'static str {
        match self {
            TrustLevel::Untrusted => "Untrusted",
            TrustLevel::Encrypted => "Encrypted",
            TrustLevel::Verified => "Verified",
        }
    }

    /// Whether sending sensitive files should trigger a warning.
    /// Only Level 2 (Verified) is considered safe.
    pub fn requires_file_warning(self) -> bool {
        self < TrustLevel::Verified
    }
}

impl std::fmt::Display for TrustLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Level {} ({})", *self as u8, self.label())
    }
}

// ── Identity Key Change Detection ───────────────────────────────────

/// Outcome of comparing a contact's current identity key against the stored one.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IdentityKeyChangeResult {
    /// Key is unchanged — no action needed.
    Unchanged,
    /// Key has changed — the contact re-installed or their device was compromised.
    /// The UI **must** warn the user and reset trust to Level 1.
    Changed {
        previous_fingerprint: String,
        new_fingerprint: String,
    },
    /// No previous key on record (first contact).
    FirstSeen,
}

/// Compare a contact's current identity key against the previously stored one.
///
/// If the key changed, the caller **must**:
/// 1. Reset `ContactVerificationRecord.trust_level` to `Encrypted`.
/// 2. Display a prominent warning in the chat UI (similar to Signal's
///    "safety number has changed" banner).
/// 3. Require the user to re-verify via QR scan before promoting back to `Verified`.
pub fn detect_identity_key_change(
    our_identity: &[u8],
    stored_their_identity: Option<&[u8]>,
    current_their_identity: &[u8],
) -> IdentityKeyChangeResult {
    match stored_their_identity {
        None => IdentityKeyChangeResult::FirstSeen,
        Some(stored) => {
            use subtle::ConstantTimeEq;
            if stored.ct_eq(current_their_identity).into() {
                IdentityKeyChangeResult::Unchanged
            } else {
                let prev_sn = generate_safety_number(our_identity, stored);
                let new_sn = generate_safety_number(our_identity, current_their_identity);
                IdentityKeyChangeResult::Changed {
                    previous_fingerprint: prev_sn,
                    new_fingerprint: new_sn,
                }
            }
        }
    }
}

/// Record persisted per contact in the encrypted database.
/// The application (SQLCipher on mobile, IndexedDB on web) serializes this.
#[derive(Debug, Clone)]
pub struct ContactVerificationRecord {
    /// Unique contact identifier (e.g. `sl_xyz…`)
    pub contact_id: String,
    /// Current trust level (0 / 1 / 2)
    pub trust_level: TrustLevel,
    /// Unix-ms timestamp when verification was performed (0 if never)
    pub verified_at: i64,
    /// The safety number at the time of verification (empty if never verified)
    pub safety_number: String,
}

impl ContactVerificationRecord {
    /// Create a new record for a freshly-added contact (Level 1 = encrypted).
    pub fn new_encrypted(contact_id: String) -> Self {
        Self {
            contact_id,
            trust_level: TrustLevel::Encrypted,
            verified_at: 0,
            safety_number: String::new(),
        }
    }

    /// Promote to Level 2 after successful QR verification.
    pub fn mark_verified(&mut self, safety_number: String, now_ms: i64) {
        self.trust_level = TrustLevel::Verified;
        self.verified_at = now_ms;
        self.safety_number = safety_number;
    }

    /// Demote back to Level 1 (e.g. when identity key changes).
    pub fn reset_to_encrypted(&mut self) {
        self.trust_level = TrustLevel::Encrypted;
        self.verified_at = 0;
        self.safety_number.clear();
    }
}

/// Result of a QR-based fingerprint verification
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VerificationStatus {
    /// Fingerprints match — contact is verified
    Verified,
    /// Fingerprints do NOT match — possible MITM
    Mismatch,
    /// Scanned data is malformed / unparseable
    InvalidData,
}

/// Data encoded in the verification QR code
#[derive(Debug, Clone)]
pub struct FingerprintQrPayload {
    /// The identity public key (base64)
    pub identity_key: Vec<u8>,
    /// The pre-computed safety number
    pub safety_number: String,
}

impl FingerprintQrPayload {
    /// Serialize to a QR-encodable string: `SM-VERIFY:1:<base64-identity>:<safety-number>`
    pub fn encode(&self) -> String {
        use base64::Engine;
        let id_b64 = base64::engine::general_purpose::STANDARD.encode(&self.identity_key);
        format!("SM-VERIFY:1:{}:{}", id_b64, self.safety_number)
    }

    /// Parse a QR-scanned string back into a payload
    pub fn decode(qr_data: &str) -> Option<Self> {
        let parts: Vec<&str> = qr_data.splitn(4, ':').collect();
        if parts.len() != 4 || parts[0] != "SM-VERIFY" || parts[1] != "1" {
            return None;
        }
        use base64::Engine;
        let identity_key = base64::engine::general_purpose::STANDARD
            .decode(parts[2])
            .ok()?;
        let safety_number = parts[3].to_string();
        Some(Self {
            identity_key,
            safety_number,
        })
    }
}

/// Verify a contact's identity by comparing a scanned QR fingerprint
/// against our locally-computed safety number.
///
/// # Flow
/// 1. Device A shows QR code containing `FingerprintQrPayload::encode()`
/// 2. Device B scans QR → calls this function with the scanned data
/// 3. Returns `Verified` only if the safety number in the QR matches
///    what we compute locally from both identity keys.
pub fn verify_contact_fingerprint(
    our_identity: &[u8],
    scanned_qr_data: &str,
) -> VerificationStatus {
    let payload = match FingerprintQrPayload::decode(scanned_qr_data) {
        Some(p) => p,
        None => return VerificationStatus::InvalidData,
    };

    let computed = generate_safety_number(our_identity, &payload.identity_key);

    use subtle::ConstantTimeEq;
    if computed
        .as_bytes()
        .ct_eq(payload.safety_number.as_bytes())
        .into()
    {
        VerificationStatus::Verified
    } else {
        VerificationStatus::Mismatch
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hybrid_keypair_from_seed() {
        let seed = [42u8; 32];
        let keypair = generate_hybrid_keypair_from_seed(&seed).unwrap();
        assert_eq!(keypair.x25519_public.len(), 32);
        assert_eq!(keypair.x25519_secret.len(), 32);
        assert_eq!(keypair.kyber_public.len(), MLKEM1024_EK_BYTES);
        assert_eq!(keypair.kyber_secret.len(), MLKEM1024_DK_BYTES);

        // Deterministic
        let keypair2 = generate_hybrid_keypair_from_seed(&seed).unwrap();
        assert_eq!(keypair.x25519_public, keypair2.x25519_public);
        assert_eq!(keypair.kyber_public, keypair2.kyber_public);
    }

    #[test]
    fn test_hybrid_keypair_random() {
        let kp1 = generate_hybrid_keypair_random().unwrap();
        let kp2 = generate_hybrid_keypair_random().unwrap();
        assert_ne!(kp1.x25519_public, kp2.x25519_public);
        assert_ne!(kp1.kyber_public, kp2.kyber_public);
    }

    #[test]
    fn test_hybrid_encapsulate_decapsulate() {
        let keypair = generate_hybrid_keypair_random().unwrap();

        let ct = hybrid_encapsulate(&keypair.x25519_public, &keypair.kyber_public).unwrap();
        assert_eq!(ct.shared_secret.len(), 64);
        assert_eq!(ct.kyber_ciphertext.len(), MLKEM1024_CT_BYTES);

        let recovered = hybrid_decapsulate(
            &ct.x25519_ephemeral_public,
            &ct.kyber_ciphertext,
            &keypair.x25519_secret,
            &keypair.kyber_secret,
        )
        .unwrap();

        assert_eq!(ct.shared_secret, recovered);
    }

    #[test]
    fn test_safety_number_format() {
        let kp1 = generate_hybrid_keypair_random().unwrap();
        let kp2 = generate_hybrid_keypair_random().unwrap();
        let sn = generate_safety_number(&kp1.x25519_public, &kp2.x25519_public);
        // 12 groups of 5 digits separated by spaces
        let groups: Vec<&str> = sn.split(' ').collect();
        assert_eq!(groups.len(), 12);
        for g in &groups {
            assert_eq!(g.len(), 5);
            assert!(g.chars().all(|c| c.is_ascii_digit()));
        }
        // Total: 60 digits
        assert_eq!(sn.replace(' ', "").len(), 60);
    }

    #[test]
    fn test_safety_number_verification() {
        let kp1 = generate_hybrid_keypair_random().unwrap();
        let kp2 = generate_hybrid_keypair_random().unwrap();
        let sn = generate_safety_number(&kp1.x25519_public, &kp2.x25519_public);
        assert!(verify_safety_number(
            &kp1.x25519_public,
            &kp2.x25519_public,
            &sn
        ));
        assert!(!verify_safety_number(
            &kp1.x25519_public,
            &kp2.x25519_public,
            "00000 00000 00000 00000 00000 00000 00000 00000 00000 00000 00000 00000"
        ));
    }

    #[test]
    fn test_invalid_key_lengths() {
        let short_key = [0u8; 16];
        let result = hybrid_encapsulate(&short_key, &[0u8; MLKEM1024_EK_BYTES]);
        assert!(result.is_err());
        let result = hybrid_encapsulate(&[0u8; 32], &short_key);
        assert!(result.is_err());
    }

    #[test]
    fn test_fingerprint_qr_encode_decode_roundtrip() {
        let kp = generate_hybrid_keypair_random().unwrap();
        let sn = generate_safety_number(&kp.x25519_public, &[99u8; 32]);

        let payload = FingerprintQrPayload {
            identity_key: kp.x25519_public.to_vec(),
            safety_number: sn.clone(),
        };
        let encoded = payload.encode();
        assert!(encoded.starts_with("SM-VERIFY:1:"));

        let decoded = FingerprintQrPayload::decode(&encoded).unwrap();
        assert_eq!(decoded.identity_key, kp.x25519_public.to_vec());
        assert_eq!(decoded.safety_number, sn);
    }

    #[test]
    fn test_fingerprint_qr_decode_invalid() {
        assert!(FingerprintQrPayload::decode("garbage").is_none());
        assert!(FingerprintQrPayload::decode("SM-VERIFY:2:abc:123").is_none());
        assert!(FingerprintQrPayload::decode("OTHER:1:abc:123").is_none());
    }

    #[test]
    fn test_verify_contact_fingerprint_match() {
        let kp1 = generate_hybrid_keypair_random().unwrap();
        let kp2 = generate_hybrid_keypair_random().unwrap();

        let sn = generate_safety_number(&kp1.x25519_public, &kp2.x25519_public);

        // kp2 encodes QR for kp1 to scan
        let payload = FingerprintQrPayload {
            identity_key: kp2.x25519_public.to_vec(),
            safety_number: sn,
        };
        let qr_data = payload.encode();

        let result = verify_contact_fingerprint(&kp1.x25519_public, &qr_data);
        assert_eq!(result, VerificationStatus::Verified);
    }

    #[test]
    fn test_verify_contact_fingerprint_mismatch() {
        let kp1 = generate_hybrid_keypair_random().unwrap();
        let kp2 = generate_hybrid_keypair_random().unwrap();
        let kp3 = generate_hybrid_keypair_random().unwrap();

        // kp3 pretends to be kp2 — MITM scenario
        let fake_sn = generate_safety_number(&kp1.x25519_public, &kp3.x25519_public);
        let payload = FingerprintQrPayload {
            identity_key: kp2.x25519_public.to_vec(),
            safety_number: fake_sn,
        };
        let qr_data = payload.encode();

        let result = verify_contact_fingerprint(&kp1.x25519_public, &qr_data);
        assert_eq!(result, VerificationStatus::Mismatch);
    }

    #[test]
    fn test_verify_contact_fingerprint_invalid_data() {
        let kp = generate_hybrid_keypair_random().unwrap();
        let result = verify_contact_fingerprint(&kp.x25519_public, "not-a-qr-code");
        assert_eq!(result, VerificationStatus::InvalidData);
    }

    // ── Trust-level tests ──────────────────────────────────────────────

    #[test]
    fn test_trust_level_ordering() {
        assert!(TrustLevel::Untrusted < TrustLevel::Encrypted);
        assert!(TrustLevel::Encrypted < TrustLevel::Verified);
    }

    #[test]
    fn test_trust_level_from_u8() {
        assert_eq!(TrustLevel::from_u8(0), TrustLevel::Untrusted);
        assert_eq!(TrustLevel::from_u8(1), TrustLevel::Encrypted);
        assert_eq!(TrustLevel::from_u8(2), TrustLevel::Verified);
        assert_eq!(TrustLevel::from_u8(255), TrustLevel::Untrusted); // unknown → Untrusted
    }

    #[test]
    fn test_trust_level_file_warning() {
        assert!(TrustLevel::Untrusted.requires_file_warning());
        assert!(TrustLevel::Encrypted.requires_file_warning());
        assert!(!TrustLevel::Verified.requires_file_warning());
    }

    #[test]
    fn test_identity_key_change_first_seen() {
        let kp1 = generate_hybrid_keypair_random().unwrap();
        let kp2 = generate_hybrid_keypair_random().unwrap();
        let result = detect_identity_key_change(&kp1.x25519_public, None, &kp2.x25519_public);
        assert_eq!(result, IdentityKeyChangeResult::FirstSeen);
    }

    #[test]
    fn test_identity_key_unchanged() {
        let kp1 = generate_hybrid_keypair_random().unwrap();
        let kp2 = generate_hybrid_keypair_random().unwrap();
        let result = detect_identity_key_change(
            &kp1.x25519_public,
            Some(&kp2.x25519_public),
            &kp2.x25519_public,
        );
        assert_eq!(result, IdentityKeyChangeResult::Unchanged);
    }

    #[test]
    fn test_identity_key_changed_mitm_warning() {
        let kp1 = generate_hybrid_keypair_random().unwrap();
        let kp2 = generate_hybrid_keypair_random().unwrap();
        let kp3 = generate_hybrid_keypair_random().unwrap(); // attacker
        let result = detect_identity_key_change(
            &kp1.x25519_public,
            Some(&kp2.x25519_public),
            &kp3.x25519_public,
        );
        match result {
            IdentityKeyChangeResult::Changed {
                previous_fingerprint,
                new_fingerprint,
            } => {
                assert_ne!(previous_fingerprint, new_fingerprint);
                // Verify the fingerprints are valid safety numbers
                assert_eq!(previous_fingerprint.split(' ').count(), 12);
                assert_eq!(new_fingerprint.split(' ').count(), 12);
            }
            _ => panic!("Expected Changed, got {:?}", result),
        }
    }

    #[test]
    fn test_contact_verification_record_lifecycle() {
        let mut rec = ContactVerificationRecord::new_encrypted("sl_test123".to_string());
        assert_eq!(rec.trust_level, TrustLevel::Encrypted);
        assert_eq!(rec.verified_at, 0);
        assert!(rec.safety_number.is_empty());

        rec.mark_verified("12345 67890 12345 67890".to_string(), 1700000000000);
        assert_eq!(rec.trust_level, TrustLevel::Verified);
        assert_eq!(rec.verified_at, 1700000000000);
        assert!(!rec.safety_number.is_empty());

        rec.reset_to_encrypted();
        assert_eq!(rec.trust_level, TrustLevel::Encrypted);
        assert_eq!(rec.verified_at, 0);
        assert!(rec.safety_number.is_empty());
    }
}
