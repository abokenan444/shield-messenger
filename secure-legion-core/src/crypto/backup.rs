/// Encrypted Key Backup & Recovery Module
///
/// Provides secure key backup using Shamir's Secret Sharing (SSS) combined
/// with Argon2id key derivation and XChaCha20-Poly1305 encryption.
///
/// Backup strategies:
/// 1. **Password-only**: Encrypt identity seed with Argon2id-derived key
/// 2. **Social recovery**: Split seed into N shares, requiring K-of-N to reconstruct
/// 3. **Combined**: Encrypt the seed, then split the encryption key into shares
///
/// The backup blob format:
/// ```text
/// [version: 1][salt: 16][nonce: 24][ciphertext][tag: 16]
/// ```
///
/// Social recovery uses a simple (K, N) threshold scheme over GF(256).

use crate::crypto::encryption;
use argon2::{Argon2, Algorithm, Version, Params};
use rand::RngCore;
use thiserror::Error;
use zeroize::Zeroize;

const BACKUP_VERSION: u8 = 0x01;
const SALT_SIZE: usize = 16;
const ARGON2_MEM_COST: u32 = 65536;  // 64 MiB
const ARGON2_TIME_COST: u32 = 4;
const ARGON2_PARALLELISM: u32 = 2;

#[derive(Error, Debug)]
pub enum BackupError {
    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),
    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),
    #[error("Key derivation failed")]
    KeyDerivationFailed,
    #[error("Invalid backup format")]
    InvalidFormat,
    #[error("Invalid backup version: {0}")]
    InvalidVersion(u8),
    #[error("Invalid threshold parameters: need {k} of {n}")]
    InvalidThreshold { k: usize, n: usize },
    #[error("Not enough shares: have {have}, need {need}")]
    NotEnoughShares { have: usize, need: usize },
    #[error("Share reconstruction failed")]
    ReconstructionFailed,
}

pub type Result<T> = std::result::Result<T, BackupError>;

/// Encrypted backup blob
#[derive(Clone, Debug)]
pub struct BackupBlob {
    pub data: Vec<u8>,
}

/// A share of a secret for social recovery
#[derive(Clone, Debug)]
pub struct SecretShare {
    /// Share index (1-based, x-coordinate in polynomial)
    pub index: u8,
    /// Share data (y-coordinate evaluations)
    pub data: Vec<u8>,
}

/// Derive an encryption key from a password using Argon2id
fn derive_key_from_password(password: &str, salt: &[u8]) -> Result<[u8; 32]> {
    let params = Params::new(ARGON2_MEM_COST, ARGON2_TIME_COST, ARGON2_PARALLELISM, Some(32))
        .map_err(|_| BackupError::KeyDerivationFailed)?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = [0u8; 32];
    argon2.hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|_| BackupError::KeyDerivationFailed)?;

    Ok(key)
}

/// Create an encrypted backup of secret data (e.g., identity seed)
///
/// # Arguments
/// * `secret` - The secret data to backup (e.g., 32 or 64 byte seed)
/// * `password` - User's backup password
///
/// # Returns
/// Encrypted backup blob
pub fn create_encrypted_backup(secret: &[u8], password: &str) -> Result<BackupBlob> {
    let mut salt = [0u8; SALT_SIZE];
    rand::rngs::OsRng.fill_bytes(&mut salt);

    let mut key = derive_key_from_password(password, &salt)?;

    let encrypted = encryption::encrypt_message(secret, &key)
        .map_err(|e| BackupError::EncryptionFailed(e.to_string()))?;

    key.zeroize();

    // Build backup blob: [version][salt][encrypted_data]
    let mut blob = Vec::with_capacity(1 + SALT_SIZE + encrypted.len());
    blob.push(BACKUP_VERSION);
    blob.extend_from_slice(&salt);
    blob.extend_from_slice(&encrypted);

    Ok(BackupBlob { data: blob })
}

/// Restore secret data from an encrypted backup
///
/// # Arguments
/// * `backup` - The encrypted backup blob
/// * `password` - User's backup password
///
/// # Returns
/// The original secret data
pub fn restore_encrypted_backup(backup: &BackupBlob, password: &str) -> Result<Vec<u8>> {
    if backup.data.len() < 1 + SALT_SIZE + 24 + 16 {
        return Err(BackupError::InvalidFormat);
    }

    let version = backup.data[0];
    if version != BACKUP_VERSION {
        return Err(BackupError::InvalidVersion(version));
    }

    let salt = &backup.data[1..1 + SALT_SIZE];
    let encrypted = &backup.data[1 + SALT_SIZE..];

    let mut key = derive_key_from_password(password, salt)?;

    let secret = encryption::decrypt_message(encrypted, &key)
        .map_err(|e| BackupError::DecryptionFailed(e.to_string()))?;

    key.zeroize();

    Ok(secret)
}

// ── Shamir's Secret Sharing over GF(256) ──

/// GF(256) multiplication using the irreducible polynomial x^8 + x^4 + x^3 + x + 1
fn gf256_mul(mut a: u8, mut b: u8) -> u8 {
    let mut result: u8 = 0;
    while b > 0 {
        if b & 1 != 0 {
            result ^= a;
        }
        let carry = a & 0x80;
        a <<= 1;
        if carry != 0 {
            a ^= 0x1B; // x^8 + x^4 + x^3 + x + 1
        }
        b >>= 1;
    }
    result
}

/// GF(256) multiplicative inverse using extended Euclidean algorithm
fn gf256_inv(a: u8) -> u8 {
    if a == 0 {
        return 0; // 0 has no inverse, but we return 0 (shouldn't happen in valid shares)
    }
    // a^254 = a^(-1) in GF(256) by Fermat's little theorem
    let mut result = a;
    for _ in 0..6 {
        result = gf256_mul(result, result);
        result = gf256_mul(result, a);
    }
    // One more squaring to get a^254
    gf256_mul(result, result)
}

/// Evaluate a polynomial at a given point in GF(256)
fn gf256_eval_poly(coeffs: &[u8], x: u8) -> u8 {
    let mut result = 0u8;
    let mut x_pow = 1u8;
    for &coeff in coeffs {
        result ^= gf256_mul(coeff, x_pow);
        x_pow = gf256_mul(x_pow, x);
    }
    result
}

/// Split a secret into N shares, requiring K to reconstruct
///
/// Uses Shamir's Secret Sharing over GF(256).
///
/// # Arguments
/// * `secret` - The secret bytes to split
/// * `k` - Threshold (minimum shares needed to reconstruct)
/// * `n` - Total number of shares to generate
///
/// # Returns
/// Vector of N SecretShares
pub fn split_secret(secret: &[u8], k: usize, n: usize) -> Result<Vec<SecretShare>> {
    if k < 2 || k > n || n > 255 {
        return Err(BackupError::InvalidThreshold { k, n });
    }

    let mut shares: Vec<SecretShare> = (0..n)
        .map(|i| SecretShare {
            index: (i + 1) as u8,
            data: Vec::with_capacity(secret.len()),
        })
        .collect();

    let mut rng = rand::rngs::OsRng;

    for &byte in secret {
        // Build polynomial: coeffs[0] = secret_byte, coeffs[1..k] = random
        let mut coeffs = vec![0u8; k];
        coeffs[0] = byte;
        rng.fill_bytes(&mut coeffs[1..]);

        // Evaluate polynomial at x = 1, 2, ..., n
        for share in shares.iter_mut() {
            let y = gf256_eval_poly(&coeffs, share.index);
            share.data.push(y);
        }

        // Zeroize coefficients
        coeffs.zeroize();
    }

    Ok(shares)
}

/// Reconstruct a secret from K or more shares using Lagrange interpolation
///
/// # Arguments
/// * `shares` - At least K shares from the original split
/// * `k` - The threshold used during splitting
///
/// # Returns
/// The reconstructed secret
pub fn reconstruct_secret(shares: &[SecretShare], k: usize) -> Result<Vec<u8>> {
    if shares.len() < k {
        return Err(BackupError::NotEnoughShares {
            have: shares.len(),
            need: k,
        });
    }

    let selected = &shares[..k];
    let secret_len = selected[0].data.len();

    // Verify all shares have the same length
    if selected.iter().any(|s| s.data.len() != secret_len) {
        return Err(BackupError::ReconstructionFailed);
    }

    let mut secret = Vec::with_capacity(secret_len);

    for byte_idx in 0..secret_len {
        let mut value = 0u8;

        // Lagrange interpolation at x=0
        for i in 0..k {
            let xi = selected[i].index;
            let yi = selected[i].data[byte_idx];

            // Compute Lagrange basis polynomial L_i(0)
            let mut basis = 1u8;
            for j in 0..k {
                if i == j {
                    continue;
                }
                let xj = selected[j].index;
                // L_i(0) *= (0 - xj) / (xi - xj) = xj / (xi ^ xj) in GF(256)
                let num = xj;
                let den = xi ^ xj;
                basis = gf256_mul(basis, gf256_mul(num, gf256_inv(den)));
            }

            value ^= gf256_mul(yi, basis);
        }

        secret.push(value);
    }

    Ok(secret)
}

/// Create a social recovery backup: encrypt with password, then split the key
///
/// # Arguments
/// * `secret` - The secret to backup
/// * `password` - Base encryption password
/// * `k` - Threshold of shares needed
/// * `n` - Total shares to generate
///
/// # Returns
/// (encrypted_blob, shares) - The encrypted data and the key shares
pub fn create_social_recovery_backup(
    secret: &[u8],
    password: &str,
    k: usize,
    n: usize,
) -> Result<(BackupBlob, Vec<SecretShare>)> {
    // First encrypt with password
    let blob = create_encrypted_backup(secret, password)?;

    // Extract the salt and derive the key again to split it
    let salt = &blob.data[1..1 + SALT_SIZE];
    let key = derive_key_from_password(password, salt)?;

    // Split the derived key into shares
    let shares = split_secret(&key, k, n)?;

    Ok((blob, shares))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backup_restore() {
        let secret = b"my identity seed 32 bytes long!!";
        let password = "strong_password_123!";

        let backup = create_encrypted_backup(secret, password).unwrap();
        assert!(backup.data.len() > secret.len());

        let restored = restore_encrypted_backup(&backup, password).unwrap();
        assert_eq!(restored, secret);
    }

    #[test]
    fn test_backup_wrong_password() {
        let secret = b"secret data";
        let backup = create_encrypted_backup(secret, "correct_password").unwrap();

        let result = restore_encrypted_backup(&backup, "wrong_password");
        assert!(result.is_err());
    }

    #[test]
    fn test_shamir_split_reconstruct() {
        let secret = b"Hello Secret Sharing World!";

        // 3-of-5 threshold
        let shares = split_secret(secret, 3, 5).unwrap();
        assert_eq!(shares.len(), 5);

        // Reconstruct from any 3 shares
        let recovered = reconstruct_secret(&shares[0..3], 3).unwrap();
        assert_eq!(recovered, secret);

        // Different subset of 3
        let recovered2 = reconstruct_secret(&shares[2..5], 3).unwrap();
        assert_eq!(recovered2, secret);

        // All 5 also works
        let recovered3 = reconstruct_secret(&shares, 3).unwrap();
        assert_eq!(recovered3, secret);
    }

    #[test]
    fn test_shamir_insufficient_shares() {
        let secret = b"test";
        let shares = split_secret(secret, 3, 5).unwrap();

        // Only 2 shares — should fail
        let result = reconstruct_secret(&shares[0..2], 3);
        assert!(result.is_err());
    }

    #[test]
    fn test_shamir_invalid_threshold() {
        let secret = b"test";
        assert!(split_secret(secret, 1, 5).is_err()); // k < 2
        assert!(split_secret(secret, 6, 5).is_err()); // k > n
    }

    #[test]
    fn test_gf256_mul() {
        assert_eq!(gf256_mul(0, 42), 0);
        assert_eq!(gf256_mul(1, 42), 42);
        assert_eq!(gf256_mul(42, 1), 42);
    }

    #[test]
    fn test_gf256_inv() {
        for a in 1u8..=255 {
            let inv = gf256_inv(a);
            assert_eq!(gf256_mul(a, inv), 1, "Failed for a={}", a);
        }
    }

    #[test]
    fn test_social_recovery() {
        let secret = [42u8; 32];
        let password = "base_password";

        let (blob, shares) = create_social_recovery_backup(&secret, password, 2, 3).unwrap();
        assert_eq!(shares.len(), 3);

        // Can still restore with password
        let restored = restore_encrypted_backup(&blob, password).unwrap();
        assert_eq!(restored, secret);
    }
}
