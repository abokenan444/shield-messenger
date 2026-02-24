//! Post-Quantum Double Ratchet with ML-KEM-1024
//!
//! Combines the existing symmetric chain ratchet with optional KEM ratchet steps
//! for post-compromise security. Root key can be derived from hybrid X25519+ML-KEM
//! shared secret; KEM rekey steps refresh the root key so that compromise of current
//! state does not reveal future messages.

use crate::crypto::encryption::{
    derive_incoming_chain_key, derive_outgoing_chain_key, derive_root_key,
    decrypt_message_with_evolution, encrypt_message_with_evolution, EncryptionError, Result as EncResult,
};
use crate::crypto::pqc::{hybrid_decapsulate, hybrid_encapsulate, HybridCiphertext, HybridKEMKeypair};
use std::fmt;
use thiserror::Error;
use zeroize::Zeroize;

const ROOT_KEY_INFO: &[u8] = b"SecureLegion-RootKey-v1";
const KEM_REKEY_INFO: &[u8] = b"SecureLegion-KEM-Rekey-v1";

#[derive(Error, Debug)]
pub enum PQRatchetError {
    #[error("Encryption error: {0}")]
    Encryption(#[from] EncryptionError),
    #[error("KEM error")]
    Kem,
    #[error("Invalid state")]
    InvalidState,
}

/// Direction of the chain (for wire encoding).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ChainDirection {
    Outgoing,
    Incoming,
}

/// Post-quantum ratchet state: root key + sending/receiving chain keys and sequence numbers.
/// Root key is derived from hybrid KEM shared secret; chains are evolved with HMAC (existing scheme).
/// KEM rekey steps replace the root key for post-compromise security.
pub struct PQRatchetState {
    pub root_key: [u8; 32],
    pub sending_chain_key: [u8; 32],
    pub receiving_chain_key: [u8; 32],
    pub sending_sequence: u64,
    pub receiving_sequence: u64,
    /// True if we are the "smaller" side (lexicographic onion); determines which chain is send vs receive.
    pub we_send_outgoing: bool,
}

impl fmt::Debug for PQRatchetState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("PQRatchetState")
            .field("sending_sequence", &self.sending_sequence)
            .field("receiving_sequence", &self.receiving_sequence)
            .field("we_send_outgoing", &self.we_send_outgoing)
            .finish_non_exhaustive()
    }
}

impl Drop for PQRatchetState {
    fn drop(&mut self) {
        self.root_key.zeroize();
        self.sending_chain_key.zeroize();
        self.receiving_chain_key.zeroize();
    }
}

impl PQRatchetState {
    /// Create ratchet state from hybrid KEM shared secret (64 bytes) and direction.
    /// `our_onion < their_onion` (lexicographic) => we use "outgoing" for sending.
    pub fn from_hybrid_secret(
        hybrid_shared_secret: &[u8; 64],
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
        })
    }

    /// Encrypt a message and advance the sending chain (same as existing ratchet).
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, PQRatchetError> {
        let seq = self.sending_sequence;
        let result = encrypt_message_with_evolution(
            plaintext,
            &mut self.sending_chain_key,
            seq,
        )?;
        self.sending_sequence = seq + 1;
        Ok(result.ciphertext)
    }

    /// Decrypt a message and advance the receiving chain (same as existing ratchet).
    pub fn decrypt(&mut self, ciphertext: &[u8]) -> Result<Vec<u8>, PQRatchetError> {
        let expected = self.receiving_sequence;
        let result = decrypt_message_with_evolution(
            ciphertext,
            &mut self.receiving_chain_key,
            expected,
        )?;
        self.receiving_sequence = expected + 1;
        Ok(result.plaintext)
    }

    /// Perform a KEM ratchet step: encapsulate to peer's KEM public key, derive new root key,
    /// and reset chain keys from the new root. Returns the KEM ciphertext to send to the peer.
    /// After this, both sides use the new root for subsequent chain evolution (post-compromise security).
    pub fn kem_ratchet_send(
        &mut self,
        peer_x25519_public: &[u8; 32],
        peer_kyber_public: &[u8; 1568],
    ) -> Result<HybridCiphertext, PQRatchetError> {
        let (new_shared_secret, ciphertext) = hybrid_encapsulate(peer_x25519_public, peer_kyber_public)
            .map_err(|_| PQRatchetError::Kem)?;

        let mut new_root = derive_root_key(&new_shared_secret, KEM_REKEY_INFO)?;
        let outgoing = derive_outgoing_chain_key(&new_root)?;
        let incoming = derive_incoming_chain_key(&new_root)?;

        self.root_key.zeroize();
        self.root_key = new_root;

        let (sending_chain_key, receiving_chain_key) = if self.we_send_outgoing {
            (outgoing, incoming)
        } else {
            (incoming, outgoing)
        };
        self.sending_chain_key.zeroize();
        self.receiving_chain_key.zeroize();
        self.sending_chain_key = sending_chain_key;
        self.receiving_chain_key = receiving_chain_key;
        self.sending_sequence = 0;
        self.receiving_sequence = 0;

        Ok(ciphertext)
    }

    /// Process an incoming KEM ratchet step: decapsulate, derive new root, reset chains.
    pub fn kem_ratchet_receive(
        &mut self,
        our_keypair: &HybridKEMKeypair,
        ciphertext: &HybridCiphertext,
    ) -> Result<(), PQRatchetError> {
        let new_shared_secret = hybrid_decapsulate(
            &our_keypair.x25519_secret,
            &our_keypair.kyber_secret,
            ciphertext,
        )
        .map_err(|_| PQRatchetError::Kem)?;

        let mut new_root = derive_root_key(&new_shared_secret, KEM_REKEY_INFO)?;
        let outgoing = derive_outgoing_chain_key(&new_root)?;
        let incoming = derive_incoming_chain_key(&new_root)?;

        self.root_key.zeroize();
        self.root_key = new_root;

        let (sending_chain_key, receiving_chain_key) = if self.we_send_outgoing {
            (outgoing, incoming)
        } else {
            (incoming, outgoing)
        };
        self.sending_chain_key.zeroize();
        self.receiving_chain_key.zeroize();
        self.sending_chain_key = sending_chain_key;
        self.receiving_chain_key = receiving_chain_key;
        self.sending_sequence = 0;
        self.receiving_sequence = 0;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::pqc::generate_hybrid_keypair_from_seed;
    use rand::RngCore;

    #[test]
    fn test_pq_ratchet_from_hybrid() {
        let mut seed = [0u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut seed);
        let alice_kp = generate_hybrid_keypair_from_seed(&seed).unwrap();
        let mut seed2 = [0u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut seed2);
        let bob_kp = generate_hybrid_keypair_from_seed(&seed2).unwrap();

        let (alice_shared, ct) = hybrid_encapsulate(&bob_kp.x25519_public, &bob_kp.kyber_public).unwrap();
        let bob_shared = hybrid_decapsulate(&bob_kp.x25519_secret, &bob_kp.kyber_secret, &ct).unwrap();
        assert_eq!(alice_shared, bob_shared);

        let mut alice = PQRatchetState::from_hybrid_secret(
            &alice_shared,
            "alice.onion",
            "bob.onion",
        ).unwrap();
        let mut bob = PQRatchetState::from_hybrid_secret(
            &bob_shared,
            "bob.onion",
            "alice.onion",
        ).unwrap();

        let msg = b"hello post-quantum";
        let enc = alice.encrypt(msg).unwrap();
        let dec = bob.decrypt(&enc).unwrap();
        assert_eq!(dec.as_slice(), msg);
    }
}
