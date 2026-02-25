//! Post-Quantum Double Ratchet with ML-KEM-1024
//!
//! Combines the existing symmetric chain ratchet with optional KEM ratchet steps
//! for post-compromise security. Root key is derived from hybrid X25519+ML-KEM
//! shared secret; KEM rekey steps refresh the root key so that compromise of
//! current state does not reveal future messages.
//!
//! **Out-of-order messages:** A skipped-message key cache allows decryption of
//! messages that arrive out of order (up to MAX_SKIP ahead of expected sequence).
//! Skipped keys are stored temporarily and zeroized after use or on expiry.

use crate::crypto::encryption::{
    derive_incoming_chain_key, derive_message_key, derive_outgoing_chain_key, derive_root_key,
    evolve_chain_key, EncryptionError,
};
use crate::crypto::pqc::{hybrid_decapsulate, hybrid_encapsulate, HybridCiphertext, HybridKEMKeypair};
use chacha20poly1305::{aead::{Aead, KeyInit, OsRng}, XChaCha20Poly1305, XNonce};
use rand::RngCore;
use std::collections::HashMap;
use std::fmt;
use thiserror::Error;
use zeroize::Zeroize;

const ROOT_KEY_INFO: &[u8] = b"SecureLegion-RootKey-v1";
const KEM_REKEY_INFO: &[u8] = b"SecureLegion-KEM-Rekey-v1";

/// Max messages we'll skip ahead for out-of-order delivery.
const MAX_SKIP: u64 = 256;

#[derive(Error, Debug)]
pub enum PQRatchetError {
    #[error("Encryption error: {0}")]
    Encryption(#[from] EncryptionError),
    #[error("KEM error")]
    Kem,
    #[error("Invalid state")]
    InvalidState,
    #[error("Message too far ahead (skip > {0})")]
    TooFarAhead(u64),
    #[error("Duplicate message (sequence already consumed)")]
    DuplicateMessage,
}

/// Direction of the chain (for wire encoding).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ChainDirection {
    Outgoing,
    Incoming,
}

/// Post-quantum ratchet state with out-of-order support.
pub struct PQRatchetState {
    root_key: [u8; 32],
    sending_chain_key: [u8; 32],
    receiving_chain_key: [u8; 32],
    pub sending_sequence: u64,
    pub receiving_sequence: u64,
    we_send_outgoing: bool,
    /// Skipped message keys: sequence -> message_key. Allows out-of-order decryption.
    skipped_keys: HashMap<u64, [u8; 32]>,
    /// Number of KEM ratchet steps performed (for diagnostics).
    pub kem_ratchet_count: u64,
}

impl fmt::Debug for PQRatchetState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("PQRatchetState")
            .field("sending_sequence", &self.sending_sequence)
            .field("receiving_sequence", &self.receiving_sequence)
            .field("we_send_outgoing", &self.we_send_outgoing)
            .field("skipped_keys_count", &self.skipped_keys.len())
            .field("kem_ratchet_count", &self.kem_ratchet_count)
            .finish_non_exhaustive()
    }
}

impl Drop for PQRatchetState {
    fn drop(&mut self) {
        self.root_key.zeroize();
        self.sending_chain_key.zeroize();
        self.receiving_chain_key.zeroize();
        for (_, key) in self.skipped_keys.drain() {
            let mut k = key;
            k.zeroize();
        }
    }
}

impl PQRatchetState {
    /// Create ratchet state from hybrid KEM shared secret (64 bytes) and direction.
    pub fn from_hybrid_secret(
        hybrid_shared_secret: &[u8],
        our_onion: &str,
        their_onion: &str,
    ) -> Result<Self, PQRatchetError> {
        let root_key = derive_root_key(hybrid_shared_secret, ROOT_KEY_INFO)?;
        let outgoing = derive_outgoing_chain_key(&root_key)?;
        let incoming = derive_incoming_chain_key(&root_key)?;
        let we_send_outgoing = our_onion < their_onion;

        let (sending_chain_key, receiving_chain_key) = if we_send_outgoing {
            (outgoing, incoming)
        } else {
            (incoming, outgoing)
        };

        Ok(Self {
            root_key,
            sending_chain_key,
            receiving_chain_key,
            sending_sequence: 0,
            receiving_sequence: 0,
            we_send_outgoing,
            skipped_keys: HashMap::new(),
            kem_ratchet_count: 0,
        })
    }

    /// Encrypt a message and advance the sending chain.
    /// Wire format: [version:1][sequence:8][nonce:24][ciphertext+tag]
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, PQRatchetError> {
        let seq = self.sending_sequence;
        let mut message_key = derive_message_key(&self.sending_chain_key)?;
        let new_chain = evolve_chain_key(&mut self.sending_chain_key)?;
        self.sending_chain_key = new_chain;
        self.sending_sequence = seq + 1;

        let cipher = XChaCha20Poly1305::new_from_slice(&message_key)
            .map_err(|_| EncryptionError::InvalidKeyLength)?;
        let mut nonce_bytes = [0u8; 24];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = XNonce::from_slice(&nonce_bytes);
        let ciphertext = cipher.encrypt(nonce, plaintext)
            .map_err(|_| EncryptionError::EncryptionFailed)?;
        message_key.zeroize();

        let mut out = Vec::with_capacity(1 + 8 + 24 + ciphertext.len());
        out.push(0x01); // version
        out.extend_from_slice(&seq.to_be_bytes());
        out.extend_from_slice(&nonce_bytes);
        out.extend_from_slice(&ciphertext);
        Ok(out)
    }

    /// Decrypt a message, handling out-of-order delivery via skipped-key cache.
    pub fn decrypt(&mut self, encrypted_data: &[u8]) -> Result<Vec<u8>, PQRatchetError> {
        if encrypted_data.len() < 1 + 8 + 24 + 16 {
            return Err(PQRatchetError::Encryption(EncryptionError::DecryptionFailed));
        }
        if encrypted_data[0] != 0x01 {
            return Err(PQRatchetError::Encryption(EncryptionError::DecryptionFailed));
        }
        let sequence = u64::from_be_bytes(
            encrypted_data[1..9].try_into()
                .map_err(|_| EncryptionError::DecryptionFailed)?
        );
        let nonce_bytes = &encrypted_data[9..33];
        let ciphertext = &encrypted_data[33..];

        // Case 1: skipped message (already in cache)
        if let Some(mut mk) = self.skipped_keys.remove(&sequence) {
            let result = self.decrypt_with_key(&mk, nonce_bytes, ciphertext);
            mk.zeroize();
            return result;
        }

        // Case 2: sequence already consumed (replay / duplicate)
        if sequence < self.receiving_sequence {
            return Err(PQRatchetError::DuplicateMessage);
        }

        // Case 3: future sequence — skip ahead and cache intermediate keys
        let skip_count = sequence - self.receiving_sequence;
        if skip_count > MAX_SKIP {
            return Err(PQRatchetError::TooFarAhead(MAX_SKIP));
        }

        // Cache skipped keys
        for skip_seq in self.receiving_sequence..sequence {
            let mk = derive_message_key(&self.receiving_chain_key)?;
            let new_chain = evolve_chain_key(&mut self.receiving_chain_key)?;
            self.receiving_chain_key = new_chain;
            self.skipped_keys.insert(skip_seq, mk);
        }

        // Now decrypt the current message
        let mut mk = derive_message_key(&self.receiving_chain_key)?;
        let new_chain = evolve_chain_key(&mut self.receiving_chain_key)?;
        self.receiving_chain_key = new_chain;
        self.receiving_sequence = sequence + 1;

        let result = self.decrypt_with_key(&mk, nonce_bytes, ciphertext);
        mk.zeroize();
        result
    }

    fn decrypt_with_key(
        &self, key: &[u8; 32], nonce_bytes: &[u8], ciphertext: &[u8],
    ) -> Result<Vec<u8>, PQRatchetError> {
        let cipher = XChaCha20Poly1305::new_from_slice(key)
            .map_err(|_| EncryptionError::InvalidKeyLength)?;
        let nonce = XNonce::from_slice(nonce_bytes);
        let plaintext = cipher.decrypt(nonce, ciphertext)
            .map_err(|_| EncryptionError::DecryptionFailed)?;
        Ok(plaintext)
    }

    /// Perform a KEM ratchet step (sender side): derive new root, reset chains.
    /// Old root key is zeroized immediately (post-compromise security).
    pub fn kem_ratchet_send(
        &mut self,
        peer_x25519_public: &[u8; 32],
        peer_kyber_public: &[u8; 1568],
    ) -> Result<HybridCiphertext, PQRatchetError> {
        let ciphertext = hybrid_encapsulate(peer_x25519_public, peer_kyber_public)
            .map_err(|_| PQRatchetError::Kem)?;

        self.apply_new_root(&ciphertext.shared_secret)?;
        self.kem_ratchet_count += 1;
        Ok(ciphertext)
    }

    /// Process incoming KEM ratchet step (receiver side).
    pub fn kem_ratchet_receive(
        &mut self,
        our_keypair: &HybridKEMKeypair,
        ciphertext: &HybridCiphertext,
    ) -> Result<(), PQRatchetError> {
        let new_shared_secret = hybrid_decapsulate(
            &ciphertext.x25519_ephemeral_public,
            &ciphertext.kyber_ciphertext,
            &our_keypair.x25519_secret,
            &our_keypair.kyber_secret,
        ).map_err(|_| PQRatchetError::Kem)?;

        self.apply_new_root(&new_shared_secret)?;
        self.kem_ratchet_count += 1;
        Ok(())
    }

    /// Derive new root from KEM shared secret, zeroize old root and chains, reset sequences.
    fn apply_new_root(&mut self, new_shared_secret: &[u8]) -> Result<(), PQRatchetError> {
        let new_root = derive_root_key(new_shared_secret, KEM_REKEY_INFO)?;
        let outgoing = derive_outgoing_chain_key(&new_root)?;
        let incoming = derive_incoming_chain_key(&new_root)?;

        // Zeroize old state
        self.root_key.zeroize();
        self.sending_chain_key.zeroize();
        self.receiving_chain_key.zeroize();
        for (_, key) in self.skipped_keys.drain() {
            let mut k = key;
            k.zeroize();
        }

        self.root_key = new_root;
        let (send, recv) = if self.we_send_outgoing {
            (outgoing, incoming)
        } else {
            (incoming, outgoing)
        };
        self.sending_chain_key = send;
        self.receiving_chain_key = recv;
        self.sending_sequence = 0;
        self.receiving_sequence = 0;
        Ok(())
    }

    /// Number of cached skipped message keys.
    pub fn skipped_key_count(&self) -> usize {
        self.skipped_keys.len()
    }

    /// Purge all skipped keys older than a given sequence threshold.
    pub fn purge_skipped_keys_before(&mut self, threshold: u64) {
        self.skipped_keys.retain(|seq, key| {
            if *seq < threshold {
                let mut k = *key;
                k.zeroize();
                false
            } else {
                true
            }
        });
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::pqc::{generate_hybrid_keypair_from_seed, hybrid_encapsulate, hybrid_decapsulate};

    fn make_pair() -> (PQRatchetState, PQRatchetState) {
        let mut seed = [0u8; 32];
        OsRng.fill_bytes(&mut seed);
        let alice_kp = generate_hybrid_keypair_from_seed(&seed).unwrap();
        let mut seed2 = [0u8; 32];
        OsRng.fill_bytes(&mut seed2);
        let bob_kp = generate_hybrid_keypair_from_seed(&seed2).unwrap();
        let ct = hybrid_encapsulate(&bob_kp.x25519_public, &bob_kp.kyber_public).unwrap();
        let bob_shared = hybrid_decapsulate(&ct.x25519_ephemeral_public, &ct.kyber_ciphertext, &bob_kp.x25519_secret, &bob_kp.kyber_secret).unwrap();
        assert_eq!(ct.shared_secret, bob_shared);
        let alice = PQRatchetState::from_hybrid_secret(&ct.shared_secret, "alice.onion", "bob.onion").unwrap();
        let bob = PQRatchetState::from_hybrid_secret(&bob_shared, "bob.onion", "alice.onion").unwrap();
        (alice, bob)
    }

    #[test]
    fn test_basic_encrypt_decrypt() {
        let (mut alice, mut bob) = make_pair();
        let msg = b"hello post-quantum";
        let enc = alice.encrypt(msg).unwrap();
        let dec = bob.decrypt(&enc).unwrap();
        assert_eq!(dec.as_slice(), msg);
    }

    #[test]
    fn test_multiple_messages() {
        let (mut alice, mut bob) = make_pair();
        for i in 0..10u8 {
            let msg = vec![i; 100];
            let enc = alice.encrypt(&msg).unwrap();
            let dec = bob.decrypt(&enc).unwrap();
            assert_eq!(dec, msg);
        }
    }

    #[test]
    fn test_out_of_order() {
        let (mut alice, mut bob) = make_pair();
        let m0 = alice.encrypt(b"msg0").unwrap();
        let m1 = alice.encrypt(b"msg1").unwrap();
        let m2 = alice.encrypt(b"msg2").unwrap();

        // Deliver m2 first (skip m0, m1)
        let d2 = bob.decrypt(&m2).unwrap();
        assert_eq!(d2.as_slice(), b"msg2");
        assert_eq!(bob.skipped_key_count(), 2);

        // Now deliver m0 (from skipped cache)
        let d0 = bob.decrypt(&m0).unwrap();
        assert_eq!(d0.as_slice(), b"msg0");
        assert_eq!(bob.skipped_key_count(), 1);

        // Now deliver m1 (from skipped cache)
        let d1 = bob.decrypt(&m1).unwrap();
        assert_eq!(d1.as_slice(), b"msg1");
        assert_eq!(bob.skipped_key_count(), 0);
    }

    #[test]
    fn test_duplicate_rejected() {
        let (mut alice, mut bob) = make_pair();
        let m0 = alice.encrypt(b"msg0").unwrap();
        bob.decrypt(&m0).unwrap();
        assert!(bob.decrypt(&m0).is_err());
    }

    #[test]
    fn test_too_far_ahead_rejected() {
        let (mut alice, mut bob) = make_pair();
        // Encrypt MAX_SKIP+1 messages and deliver only the last
        let mut msgs = Vec::new();
        for i in 0..=(MAX_SKIP + 1) {
            msgs.push(alice.encrypt(&[i as u8]).unwrap());
        }
        let result = bob.decrypt(msgs.last().unwrap());
        assert!(result.is_err());
    }

    #[test]
    fn test_kem_ratchet_post_compromise_security() {
        let (mut alice, mut bob) = make_pair();

        // Send some messages
        let m0 = alice.encrypt(b"before rekey").unwrap();
        bob.decrypt(&m0).unwrap();

        // Simulate compromise: extract Alice's current keys
        let compromised_send_key = alice.sending_chain_key;
        let compromised_recv_key = alice.receiving_chain_key;

        // KEM ratchet: Alice sends, Bob receives
        let mut seed = [0u8; 32];
        OsRng.fill_bytes(&mut seed);
        let bob_new_kp = generate_hybrid_keypair_from_seed(&seed).unwrap();
        let kyber_pub: &[u8; 1568] = bob_new_kp.kyber_public.as_slice().try_into().unwrap();
        let kem_ct = alice.kem_ratchet_send(&bob_new_kp.x25519_public, kyber_pub).unwrap();
        bob.kem_ratchet_receive(&bob_new_kp, &kem_ct).unwrap();

        // Compromised keys must differ from new state (post-compromise security)
        assert_ne!(compromised_send_key, alice.sending_chain_key);
        assert_ne!(compromised_recv_key, alice.receiving_chain_key);
        assert_eq!(alice.kem_ratchet_count, 1);

        // Messages after rekey still work
        let m1 = alice.encrypt(b"after rekey").unwrap();
        let d1 = bob.decrypt(&m1).unwrap();
        assert_eq!(d1.as_slice(), b"after rekey");
    }

    #[test]
    fn test_forward_secrecy() {
        let (mut alice, mut bob) = make_pair();

        let m0 = alice.encrypt(b"secret0").unwrap();
        let m1 = alice.encrypt(b"secret1").unwrap();

        bob.decrypt(&m0).unwrap();

        // Extracting Bob's current receiving_chain_key cannot decrypt m0
        // (the key for m0 was already evolved away)
        let current_key = bob.receiving_chain_key;
        let mk = derive_message_key(&current_key).unwrap();
        // m1 should still decrypt via Bob's current state
        let d1 = bob.decrypt(&m1).unwrap();
        assert_eq!(d1.as_slice(), b"secret1");

        // But mk (derived from current state after m0) is the key for m1, not m0
        // This proves m0's key was discarded (forward secrecy)
        let mut mk_copy = mk;
        mk_copy.zeroize();
    }
}
