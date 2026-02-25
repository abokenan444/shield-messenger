/// Post-Quantum Cryptography — Hybrid X25519 + Kyber-1024 (ML-KEM / FIPS 203)
///
/// Provides quantum-resistant key encapsulation combined with classical X25519 ECDH.
/// The hybrid approach ensures security even if one algorithm is broken.
///
/// Key sizes (Kyber-1024):
/// - Public key:       1568 bytes
/// - Secret key:       3168 bytes
/// - Ciphertext:       1568 bytes
/// - Shared secret:    32 bytes
/// - X25519 public:    32 bytes
/// - X25519 secret:    32 bytes
/// - Combined secret:  64 bytes (BLAKE3-KDF(X25519 ‖ Kyber))

use pqc_kyber::{keypair as kyber_keypair, encapsulate, decapsulate};
use pqc_kyber::{KYBER_PUBLICKEYBYTES, KYBER_SECRETKEYBYTES, KYBER_CIPHERTEXTBYTES};
use rand::rngs::OsRng;
use rand_chacha::ChaCha20Rng;
use rand::{SeedableRng, RngCore};
use thiserror::Error;
use zeroize::Zeroize;
use x25519_dalek::{StaticSecret, PublicKey};

use crate::crypto::key_exchange;

/// Kyber-1024 public key size (bytes)
pub const KYBER1024_PK_BYTES: usize = KYBER_PUBLICKEYBYTES;
/// Kyber-1024 ciphertext size (bytes)
pub const KYBER1024_CT_BYTES: usize = KYBER_CIPHERTEXTBYTES;
/// Kyber-1024 secret key size (bytes)
pub const KYBER1024_SK_BYTES: usize = KYBER_SECRETKEYBYTES;

#[derive(Error, Debug)]
pub enum PqcError {
    #[error("Kyber key generation failed")]
    KeyGenFailed,
    #[error("Kyber encapsulation failed")]
    EncapsulateFailed,
    #[error("Kyber decapsulation failed")]
    DecapsulateFailed,
    #[error("Invalid key length")]
    InvalidKeyLength,
    #[error("Invalid public key")]
    InvalidPublicKey,
    #[error("X25519 key exchange failed: {0}")]
    X25519Error(String),
}

pub type Result<T> = std::result::Result<T, PqcError>;

/// Hybrid KEM keypair: X25519 + Kyber-1024
#[derive(Clone)]
pub struct HybridKEMKeypair {
    /// X25519 public key (32 bytes)
    pub x25519_public: [u8; 32],
    /// X25519 secret key (32 bytes)
    pub x25519_secret: [u8; 32],
    /// Kyber-1024 public key (1568 bytes)
    pub kyber_public: Vec<u8>,
    /// Kyber-1024 secret key (3168 bytes)
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
    /// Kyber-1024 ciphertext (1568 bytes)
    pub kyber_ciphertext: Vec<u8>,
    /// Combined shared secret: BLAKE3-KDF(X25519_ss ‖ Kyber_ss) → 64 bytes
    pub shared_secret: Vec<u8>,
}

/// Combine two 32-byte shared secrets into a single 64-byte key via BLAKE3-KDF
fn combine_shared_secrets(x25519_ss: &[u8; 32], kyber_ss: &[u8]) -> Vec<u8> {
    let mut input = Vec::with_capacity(64);
    input.extend_from_slice(x25519_ss);
    input.extend_from_slice(kyber_ss);

    let kdf = blake3::derive_key("ShieldMessenger-HybridKEM-X25519-Kyber1024-v1", &input);
    let mut combined = Vec::with_capacity(64);
    combined.extend_from_slice(&kdf);
    let kdf2 = blake3::derive_key("ShieldMessenger-HybridKEM-X25519-Kyber1024-v1-expand", &input);
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

    // Generate Kyber-1024 keypair
    let keys = kyber_keypair(&mut rng).map_err(|_| PqcError::KeyGenFailed)?;

    Ok(HybridKEMKeypair {
        x25519_public: x25519_public_key.to_bytes(),
        x25519_secret: x25519_secret_key.to_bytes(),
        kyber_public: keys.public.to_vec(),
        kyber_secret: keys.secret.to_vec(),
    })
}

/// Generate a hybrid keypair with random keys
pub fn generate_hybrid_keypair_random() -> Result<HybridKEMKeypair> {
    let (x25519_public, x25519_secret) = key_exchange::generate_static_keypair();

    let keys = kyber_keypair(&mut OsRng).map_err(|_| PqcError::KeyGenFailed)?;

    Ok(HybridKEMKeypair {
        x25519_public,
        x25519_secret,
        kyber_public: keys.public.to_vec(),
        kyber_secret: keys.secret.to_vec(),
    })
}

/// Hybrid encapsulation: generate shared secret + ciphertext
///
/// Combines X25519 ECDH with Kyber-1024 encapsulation.
/// The resulting shared secret is bound to both algorithms via BLAKE3-KDF.
pub fn hybrid_encapsulate(
    recipient_x25519_public: &[u8],
    recipient_kyber_public: &[u8],
) -> Result<HybridCiphertext> {
    if recipient_x25519_public.len() != 32 {
        return Err(PqcError::InvalidKeyLength);
    }
    if recipient_kyber_public.len() != KYBER1024_PK_BYTES {
        return Err(PqcError::InvalidKeyLength);
    }

    // X25519 ephemeral key exchange
    let (eph_public, eph_secret) = key_exchange::generate_static_keypair();
    let x25519_shared = key_exchange::derive_shared_secret(&eph_secret, recipient_x25519_public)
        .map_err(|e| PqcError::X25519Error(e.to_string()))?;

    // Kyber-1024 encapsulation
    let (kyber_ct, kyber_ss) = encapsulate(recipient_kyber_public, &mut OsRng)
        .map_err(|_| PqcError::EncapsulateFailed)?;

    // Combine shared secrets via BLAKE3-KDF
    let combined = combine_shared_secrets(&x25519_shared, &kyber_ss);

    Ok(HybridCiphertext {
        x25519_ephemeral_public: eph_public,
        kyber_ciphertext: kyber_ct.to_vec(),
        shared_secret: combined,
    })
}

/// Hybrid decapsulation: recover shared secret from ciphertext
pub fn hybrid_decapsulate(
    x25519_ephemeral_public: &[u8],
    kyber_ciphertext: &[u8],
    our_x25519_secret: &[u8],
    our_kyber_secret: &[u8],
) -> Result<Vec<u8>> {
    if x25519_ephemeral_public.len() != 32 || our_x25519_secret.len() != 32 {
        return Err(PqcError::InvalidKeyLength);
    }
    if kyber_ciphertext.len() != KYBER1024_CT_BYTES {
        return Err(PqcError::InvalidKeyLength);
    }
    if our_kyber_secret.len() != KYBER1024_SK_BYTES {
        return Err(PqcError::InvalidKeyLength);
    }

    // X25519 recover shared secret
    let x25519_shared = key_exchange::derive_shared_secret(our_x25519_secret, x25519_ephemeral_public)
        .map_err(|e| PqcError::X25519Error(e.to_string()))?;

    // Kyber-1024 decapsulation
    let kyber_ss = decapsulate(kyber_ciphertext, our_kyber_secret)
        .map_err(|_| PqcError::DecapsulateFailed)?;

    // Combine via BLAKE3-KDF
    let combined = combine_shared_secrets(&x25519_shared, &kyber_ss);

    Ok(combined)
}

/// Generate a Safety Number for contact verification
///
/// Creates a human-readable fingerprint from both parties' identity keys.
/// Displayed as 12 groups of 5 digits for easy comparison.
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
    let hash_bytes = hash.as_bytes();

    let mut digits = String::with_capacity(71);
    for i in 0..12 {
        if i > 0 {
            digits.push(' ');
        }
        let offset = (i * 5) % 32;
        let b0 = hash_bytes[offset];
        let b1 = hash_bytes[(offset + 1) % 32];
        let b2 = hash_bytes[(offset + 2) % 32];
        let b3 = hash_bytes[(offset + 3) % 32];
        let num = u32::from_be_bytes([b0, b1, b2, b3]) % 100_000;
        digits.push_str(&format!("{:05}", num));
    }
    digits
}

/// Verify a safety number matches expected value
pub fn verify_safety_number(
    our_identity: &[u8],
    their_identity: &[u8],
    expected: &str,
) -> bool {
    let computed = generate_safety_number(our_identity, their_identity);
    use subtle::ConstantTimeEq;
    computed.as_bytes().ct_eq(expected.as_bytes()).into()
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
        assert_eq!(keypair.kyber_public.len(), KYBER1024_PK_BYTES);
        assert_eq!(keypair.kyber_secret.len(), KYBER1024_SK_BYTES);

        // Deterministic
        let keypair2 = generate_hybrid_keypair_from_seed(&seed).unwrap();
        assert_eq!(keypair.x25519_public, keypair2.x25519_public);
        assert_eq!(keypair.kyber_public, keypair2.kyber_public);
    }

    #[test]
    fn test_hybrid_keypair_random() {
        let kp = generate_hybrid_keypair_random().unwrap();
        assert_eq!(kp.x25519_public.len(), 32);
        assert_eq!(kp.kyber_public.len(), KYBER1024_PK_BYTES);
        assert_eq!(kp.kyber_secret.len(), KYBER1024_SK_BYTES);
    }

    #[test]
    fn test_hybrid_encapsulate_decapsulate() {
        let keypair = generate_hybrid_keypair_random().unwrap();

        let ciphertext = hybrid_encapsulate(
            &keypair.x25519_public,
            &keypair.kyber_public,
        ).unwrap();

        let recovered = hybrid_decapsulate(
            &ciphertext.x25519_ephemeral_public,
            &ciphertext.kyber_ciphertext,
            &keypair.x25519_secret,
            &keypair.kyber_secret,
        ).unwrap();

        assert_eq!(ciphertext.shared_secret.len(), 64);
        assert_eq!(recovered.len(), 64);
        assert_eq!(ciphertext.shared_secret, recovered);
    }

    #[test]
    fn test_different_keypairs_different_secrets() {
        let kp1 = generate_hybrid_keypair_random().unwrap();
        let kp2 = generate_hybrid_keypair_random().unwrap();

        let ct1 = hybrid_encapsulate(&kp1.x25519_public, &kp1.kyber_public).unwrap();
        let ct2 = hybrid_encapsulate(&kp2.x25519_public, &kp2.kyber_public).unwrap();

        assert_ne!(ct1.shared_secret, ct2.shared_secret);
    }

    #[test]
    fn test_safety_number_symmetric() {
        let kp1 = generate_hybrid_keypair_random().unwrap();
        let kp2 = generate_hybrid_keypair_random().unwrap();

        let sn1 = generate_safety_number(&kp1.x25519_public, &kp2.x25519_public);
        let sn2 = generate_safety_number(&kp2.x25519_public, &kp1.x25519_public);

        assert_eq!(sn1, sn2);
        assert_eq!(sn1.replace(' ', "").len(), 60);
    }

    #[test]
    fn test_safety_number_verification() {
        let kp1 = generate_hybrid_keypair_random().unwrap();
        let kp2 = generate_hybrid_keypair_random().unwrap();

        let sn = generate_safety_number(&kp1.x25519_public, &kp2.x25519_public);
        assert!(verify_safety_number(&kp1.x25519_public, &kp2.x25519_public, &sn));
        assert!(!verify_safety_number(&kp1.x25519_public, &kp2.x25519_public, "00000 00000 00000 00000 00000 00000 00000 00000 00000 00000 00000 00000"));
    }

    #[test]
    fn test_invalid_key_lengths() {
        let short_key = [0u8; 16];
        let result = hybrid_encapsulate(&short_key, &[0u8; KYBER1024_PK_BYTES]);
        assert!(result.is_err());

        let result = hybrid_encapsulate(&[0u8; 32], &short_key);
        assert!(result.is_err());
    }
}
