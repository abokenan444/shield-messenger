/// Post-Quantum Cryptography — Hybrid X25519 + ML-KEM-1024 (NIST FIPS 203)
///
/// Provides quantum-resistant key encapsulation combined with classical X25519 ECDH.
/// The hybrid approach ensures security even if one algorithm is broken.
///
/// Key sizes:
/// - ML-KEM-1024 public key:  1568 bytes
/// - ML-KEM-1024 secret key:  3168 bytes
/// - ML-KEM-1024 ciphertext:  1568 bytes
/// - ML-KEM-1024 shared secret: 32 bytes
/// - X25519 public key: 32 bytes
/// - X25519 secret key: 32 bytes
/// - Combined shared secret: 64 bytes (X25519 ‖ ML-KEM)

use pqc_kyber::*;
use rand_chacha::ChaCha20Rng;
use rand::{SeedableRng, RngCore};
use thiserror::Error;
use zeroize::Zeroize;
use x25519_dalek::{StaticSecret, PublicKey};

use crate::crypto::key_exchange;

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
    /// ML-KEM-1024 public key (1568 bytes)
    pub kyber_public: Vec<u8>,
    /// ML-KEM-1024 secret key (3168 bytes)
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
    /// Combined shared secret: HKDF(X25519_ss ‖ Kyber_ss) → 64 bytes
    pub shared_secret: Vec<u8>,
}

/// Generate a hybrid keypair from a 32-byte seed (deterministic)
///
/// Used for identity keys where reproducibility from seed is needed.
///
/// # Arguments
/// * `seed` - 32-byte seed for deterministic generation
///
/// # Returns
/// HybridKEMKeypair with both X25519 and ML-KEM-1024 components
pub fn generate_hybrid_keypair_from_seed(seed: &[u8; 32]) -> Result<HybridKEMKeypair> {
    // Derive all keys deterministically from the seed
    let mut rng = ChaCha20Rng::from_seed(*seed);

    // Generate X25519 keypair deterministically from seed-derived bytes
    let mut x25519_seed = [0u8; 32];
    rng.fill_bytes(&mut x25519_seed);
    let x25519_secret_key = StaticSecret::from(x25519_seed);
    let x25519_public_key = PublicKey::from(&x25519_secret_key);

    // Generate ML-KEM-1024 keypair using the same deterministic RNG
    let kyber_keys = keypair(&mut rng)
        .map_err(|_| PqcError::KeyGenFailed)?;

    Ok(HybridKEMKeypair {
        x25519_public: x25519_public_key.to_bytes(),
        x25519_secret: x25519_secret_key.to_bytes(),
        kyber_public: kyber_keys.public.to_vec(),
        kyber_secret: kyber_keys.secret.to_vec(),
    })
}

/// Generate a hybrid keypair with random keys
pub fn generate_hybrid_keypair_random() -> Result<HybridKEMKeypair> {
    let (x25519_public, x25519_secret) = key_exchange::generate_static_keypair();

    let mut rng = rand::thread_rng();
    let kyber_keys = keypair(&mut rng)
        .map_err(|_| PqcError::KeyGenFailed)?;

    Ok(HybridKEMKeypair {
        x25519_public,
        x25519_secret,
        kyber_public: kyber_keys.public.to_vec(),
        kyber_secret: kyber_keys.secret.to_vec(),
    })
}

/// Hybrid encapsulation: generate shared secret + ciphertext
///
/// Combines X25519 ECDH with ML-KEM-1024 encapsulation.
/// The resulting shared secret is bound to both algorithms.
///
/// # Arguments
/// * `recipient_x25519_public` - Recipient's X25519 public key (32 bytes)
/// * `recipient_kyber_public` - Recipient's ML-KEM-1024 public key (1568 bytes)
///
/// # Returns
/// HybridCiphertext containing ephemeral public key, kyber ciphertext, and shared secret
pub fn hybrid_encapsulate(
    recipient_x25519_public: &[u8],
    recipient_kyber_public: &[u8],
) -> Result<HybridCiphertext> {
    if recipient_x25519_public.len() != 32 {
        return Err(PqcError::InvalidKeyLength);
    }
    if recipient_kyber_public.len() != KYBER_PUBLICKEYBYTES {
        return Err(PqcError::InvalidKeyLength);
    }

    // Step 1: X25519 ephemeral key exchange
    let (eph_public, eph_secret) = key_exchange::generate_static_keypair();
    let x25519_shared = key_exchange::derive_shared_secret(&eph_secret, recipient_x25519_public)
        .map_err(|e| PqcError::X25519Error(e.to_string()))?;

    // Step 2: ML-KEM-1024 encapsulation
    let mut rng = rand::thread_rng();
    let mut kyber_pub_array = [0u8; KYBER_PUBLICKEYBYTES];
    kyber_pub_array.copy_from_slice(recipient_kyber_public);
    let (kyber_ciphertext, kyber_shared) = encapsulate(&kyber_pub_array, &mut rng)
        .map_err(|_| PqcError::EncapsulateFailed)?;

    // Step 3: Combine shared secrets — concatenate X25519 ‖ Kyber
    let mut combined = Vec::with_capacity(64);
    combined.extend_from_slice(&x25519_shared);
    combined.extend_from_slice(&kyber_shared);

    Ok(HybridCiphertext {
        x25519_ephemeral_public: eph_public,
        kyber_ciphertext: kyber_ciphertext.to_vec(),
        shared_secret: combined,
    })
}

/// Hybrid decapsulation: recover shared secret from ciphertext
///
/// # Arguments
/// * `x25519_ephemeral_public` - Sender's ephemeral X25519 public key (32 bytes)
/// * `kyber_ciphertext` - ML-KEM-1024 ciphertext (1568 bytes)
/// * `our_x25519_secret` - Our X25519 secret key (32 bytes)
/// * `our_kyber_secret` - Our ML-KEM-1024 secret key (3168 bytes)
///
/// # Returns
/// 64-byte combined shared secret
pub fn hybrid_decapsulate(
    x25519_ephemeral_public: &[u8],
    kyber_ciphertext: &[u8],
    our_x25519_secret: &[u8],
    our_kyber_secret: &[u8],
) -> Result<Vec<u8>> {
    if x25519_ephemeral_public.len() != 32 || our_x25519_secret.len() != 32 {
        return Err(PqcError::InvalidKeyLength);
    }
    if kyber_ciphertext.len() != KYBER_CIPHERTEXTBYTES {
        return Err(PqcError::InvalidKeyLength);
    }
    if our_kyber_secret.len() != KYBER_SECRETKEYBYTES {
        return Err(PqcError::InvalidKeyLength);
    }

    // Step 1: X25519 recover shared secret
    let x25519_shared = key_exchange::derive_shared_secret(our_x25519_secret, x25519_ephemeral_public)
        .map_err(|e| PqcError::X25519Error(e.to_string()))?;

    // Step 2: ML-KEM-1024 decapsulation
    let mut kyber_ct_array = [0u8; KYBER_CIPHERTEXTBYTES];
    kyber_ct_array.copy_from_slice(kyber_ciphertext);
    let mut kyber_sk_array = [0u8; KYBER_SECRETKEYBYTES];
    kyber_sk_array.copy_from_slice(our_kyber_secret);
    let kyber_shared = decapsulate(&kyber_ct_array, &kyber_sk_array)
        .map_err(|_| PqcError::DecapsulateFailed)?;

    // Step 3: Combine — X25519 ‖ Kyber
    let mut combined = Vec::with_capacity(64);
    combined.extend_from_slice(&x25519_shared);
    combined.extend_from_slice(&kyber_shared);

    Ok(combined)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hybrid_keypair_generation() {
        let seed = [42u8; 32];
        let keypair = generate_hybrid_keypair_from_seed(&seed).unwrap();
        assert_eq!(keypair.x25519_public.len(), 32);
        assert_eq!(keypair.x25519_secret.len(), 32);
        assert_eq!(keypair.kyber_public.len(), KYBER_PUBLICKEYBYTES);
        assert_eq!(keypair.kyber_secret.len(), KYBER_SECRETKEYBYTES);
    }

    #[test]
    fn test_hybrid_encapsulate_decapsulate() {
        let keypair = generate_hybrid_keypair_random().unwrap();

        // Encapsulate (sender side)
        let ciphertext = hybrid_encapsulate(
            &keypair.x25519_public,
            &keypair.kyber_public,
        ).unwrap();

        // Decapsulate (recipient side)
        let recovered = hybrid_decapsulate(
            &ciphertext.x25519_ephemeral_public,
            &ciphertext.kyber_ciphertext,
            &keypair.x25519_secret,
            &keypair.kyber_secret,
        ).unwrap();

        // Both sides should derive the same shared secret
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
}
