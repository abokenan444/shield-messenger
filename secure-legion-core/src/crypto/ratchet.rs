/// Post-Quantum Double Ratchet Protocol
///
/// Implements a Signal-style double ratchet with post-quantum KEM steps:
/// 1. **Symmetric ratchet**: HMAC-SHA256 chain key evolution (per message)
/// 2. **DH ratchet**: X25519 ephemeral key exchange (per round-trip)
/// 3. **KEM ratchet**: ML-KEM-1024 re-keying (every N messages for PQ security)
///
/// The KEM ratchet provides post-compromise security against quantum adversaries.
/// Even if a session key is compromised, future keys cannot be derived without
/// breaking both X25519 AND ML-KEM-1024.

use hmac::{Hmac, Mac};
use sha2::Sha256;
use zeroize::Zeroize;
use thiserror::Error;
use serde::{Serialize, Deserialize};

use crate::crypto::{
    encryption,
    key_exchange,
    pqc::{self, HybridKEMKeypair},
};

type HmacSha256 = Hmac<Sha256>;

/// How many messages between KEM ratchet steps
const KEM_RATCHET_INTERVAL: u64 = 50;

/// Maximum number of skipped message keys to store (anti-DoS)
const MAX_SKIP: usize = 200;

#[derive(Error, Debug)]
pub enum RatchetError {
    #[error("Ratchet not initialized")]
    NotInitialized,
    #[error("Chain key derivation failed")]
    ChainKeyDerivation,
    #[error("Message key derivation failed")]
    MessageKeyDerivation,
    #[error("Encryption failed: {0}")]
    Encryption(String),
    #[error("Decryption failed: {0}")]
    Decryption(String),
    #[error("DH ratchet step failed: {0}")]
    DHRatchetFailed(String),
    #[error("KEM ratchet step failed: {0}")]
    KEMRatchetFailed(String),
    #[error("Too many skipped messages")]
    TooManySkipped,
    #[error("Duplicate message detected")]
    DuplicateMessage,
}

pub type Result<T> = std::result::Result<T, RatchetError>;

/// Header sent with each ratchet message
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RatchetHeader {
    /// Sender's current DH ratchet public key (X25519, 32 bytes)
    pub dh_public: [u8; 32],
    /// Message number in sending chain
    pub message_number: u64,
    /// Number of messages in previous sending chain
    pub previous_chain_length: u64,
    /// If present, a KEM ratchet step is included
    pub kem_ciphertext: Option<Vec<u8>>,
    /// If present, sender's new KEM encapsulation key for recipient to use
    pub kem_encapsulation_key: Option<Vec<u8>>,
}

/// Stored skipped message key for out-of-order decryption
#[derive(Clone)]
struct SkippedKey {
    dh_public: [u8; 32],
    message_number: u64,
    message_key: [u8; 32],
}

impl Drop for SkippedKey {
    fn drop(&mut self) {
        self.message_key.zeroize();
    }
}

/// The Post-Quantum Double Ratchet session state
pub struct PQDoubleRatchet {
    // ── Root key chain ──
    root_key: [u8; 32],

    // ── Sending chain ──
    send_chain_key: Option<[u8; 32]>,
    send_message_number: u64,

    // ── Receiving chain ──
    recv_chain_key: Option<[u8; 32]>,
    recv_message_number: u64,

    // ── DH ratchet state ──
    our_dh_secret: [u8; 32],
    our_dh_public: [u8; 32],
    their_dh_public: Option<[u8; 32]>,

    // ── KEM ratchet state ──
    our_kem_keypair: Option<HybridKEMKeypair>,
    their_kem_ek: Option<Vec<u8>>,       // Their ML-KEM encapsulation key
    total_messages_sent: u64,

    // ── Previous chain length (for header) ──
    previous_chain_length: u64,

    // ── Skipped message keys for out-of-order delivery ──
    skipped_keys: Vec<SkippedKey>,
}

impl Drop for PQDoubleRatchet {
    fn drop(&mut self) {
        self.root_key.zeroize();
        if let Some(ref mut k) = self.send_chain_key {
            k.zeroize();
        }
        if let Some(ref mut k) = self.recv_chain_key {
            k.zeroize();
        }
        self.our_dh_secret.zeroize();
    }
}

impl PQDoubleRatchet {
    /// Initialize as the session initiator (Alice)
    ///
    /// Alice sends the first message. She knows Bob's identity keys from the friend request.
    ///
    /// # Arguments
    /// * `shared_secret` - Pre-shared secret from X3DH/hybrid handshake (64 bytes)
    /// * `their_dh_public` - Bob's DH ratchet public key from handshake
    /// * `their_kem_ek` - Bob's ML-KEM encapsulation key (optional, for first KEM step)
    pub fn init_alice(
        shared_secret: &[u8],
        their_dh_public: &[u8; 32],
        their_kem_ek: Option<&[u8]>,
    ) -> Result<Self> {
        // Derive root key from shared secret
        let root_key = kdf_root_init(shared_secret);

        // Generate our DH ratchet keypair
        let (our_dh_public, our_dh_secret) = key_exchange::generate_static_keypair();

        // Perform initial DH ratchet step: root_key + DH(our_secret, their_public)
        let dh_output = key_exchange::derive_shared_secret(&our_dh_secret, their_dh_public)
            .map_err(|e| RatchetError::DHRatchetFailed(e.to_string()))?;
        let (new_root_key, send_chain_key) = kdf_root(&root_key, &dh_output);

        // Generate KEM keypair for future KEM steps
        let our_kem_keypair = pqc::generate_hybrid_keypair_random()
            .map_err(|e: pqc::PqcError| RatchetError::KEMRatchetFailed(e.to_string()))?;

        Ok(PQDoubleRatchet {
            root_key: new_root_key,
            send_chain_key: Some(send_chain_key),
            send_message_number: 0,
            recv_chain_key: None,
            recv_message_number: 0,
            our_dh_secret,
            our_dh_public,
            their_dh_public: Some(*their_dh_public),
            our_kem_keypair: Some(our_kem_keypair),
            their_kem_ek: their_kem_ek.map(|k| k.to_vec()),
            total_messages_sent: 0,
            previous_chain_length: 0,
            skipped_keys: Vec::new(),
        })
    }

    /// Initialize as the session responder (Bob)
    ///
    /// Bob waits for Alice's first message before establishing the send chain.
    ///
    /// # Arguments
    /// * `shared_secret` - Pre-shared secret from X3DH/hybrid handshake (64 bytes)
    /// * `our_dh_keypair` - Bob's DH ratchet keypair from handshake
    pub fn init_bob(
        shared_secret: &[u8],
        our_dh_keypair: ([u8; 32], [u8; 32]),
    ) -> Result<Self> {
        let root_key = kdf_root_init(shared_secret);
        let (our_dh_public, our_dh_secret) = our_dh_keypair;

        let our_kem_keypair = pqc::generate_hybrid_keypair_random()
            .map_err(|e: pqc::PqcError| RatchetError::KEMRatchetFailed(e.to_string()))?;

        Ok(PQDoubleRatchet {
            root_key,
            send_chain_key: None,
            send_message_number: 0,
            recv_chain_key: None,
            recv_message_number: 0,
            our_dh_secret,
            our_dh_public,
            their_dh_public: None,
            our_kem_keypair: Some(our_kem_keypair),
            their_kem_ek: None,
            total_messages_sent: 0,
            previous_chain_length: 0,
            skipped_keys: Vec::new(),
        })
    }

    /// Encrypt a message and advance the sending ratchet
    ///
    /// Returns (header, ciphertext) to be sent to the peer.
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<(RatchetHeader, Vec<u8>)> {
        let send_ck = self.send_chain_key
            .ok_or(RatchetError::NotInitialized)?;

        // Derive message key from chain key
        let (new_chain_key, message_key) = kdf_chain(&send_ck);
        self.send_chain_key = Some(new_chain_key);

        // Encrypt plaintext with message key
        let ciphertext = encryption::encrypt_message(plaintext, &message_key)
            .map_err(|e| RatchetError::Encryption(e.to_string()))?;

        // Build header
        let mut header = RatchetHeader {
            dh_public: self.our_dh_public,
            message_number: self.send_message_number,
            previous_chain_length: self.previous_chain_length,
            kem_ciphertext: None,
            kem_encapsulation_key: None,
        };

        // KEM ratchet step: periodically encapsulate to their KEM key
        self.total_messages_sent += 1;
        if self.total_messages_sent % KEM_RATCHET_INTERVAL == 0 {
            if let Some(ref their_kem_ek) = self.their_kem_ek {
                if let Some(ref our_kem) = self.our_kem_keypair {
                    // Encapsulate to their KEM key
                    if let Ok(kem_ct) = pqc::hybrid_encapsulate(
                        &[0u8; 32], // KEM-only: no X25519 component for the KEM step
                        their_kem_ek,
                    ) {
                        // Mix KEM shared secret into root key
                        let (new_root, new_send_ck) = kdf_root(&self.root_key, &kem_ct.shared_secret[..32]);
                        self.root_key = new_root;
                        self.send_chain_key = Some(new_send_ck);

                        header.kem_ciphertext = Some(kem_ct.kyber_ciphertext.clone());
                        header.kem_encapsulation_key = Some(our_kem.kyber_public.clone());

                        // Generate new KEM keypair for next round
                        if let Ok(new_kem) = pqc::generate_hybrid_keypair_random() {
                            self.our_kem_keypair = Some(new_kem);
                        }
                    }
                }
            }
        }

        self.send_message_number += 1;

        Ok((header, ciphertext))
    }

    /// Decrypt a received message, performing ratchet steps as needed
    pub fn decrypt(&mut self, header: &RatchetHeader, ciphertext: &[u8]) -> Result<Vec<u8>> {
        // Check skipped message keys first
        if let Some(plaintext) = self.try_skipped_keys(header, ciphertext)? {
            return Ok(plaintext);
        }

        // If new DH ratchet public key, perform DH ratchet step
        let their_dh_changed = self.their_dh_public
            .map_or(true, |k| k != header.dh_public);

        if their_dh_changed {
            // Skip any remaining messages in the current receiving chain
            if self.their_dh_public.is_some() {
                self.skip_messages(header.previous_chain_length)?;
            }

            // Perform DH ratchet step
            self.dh_ratchet_step(&header.dh_public)?;
        }

        // Process KEM ratchet if present
        if let Some(ref kem_ct) = header.kem_ciphertext {
            self.process_kem_ratchet(kem_ct, header.kem_encapsulation_key.as_deref())?;
        }

        // Skip messages up to the received message number
        self.skip_messages(header.message_number)?;

        // Derive message key for this message
        let recv_ck = self.recv_chain_key
            .ok_or(RatchetError::NotInitialized)?;
        let (new_chain_key, message_key) = kdf_chain(&recv_ck);
        self.recv_chain_key = Some(new_chain_key);
        self.recv_message_number += 1;

        // Decrypt
        encryption::decrypt_message(ciphertext, &message_key)
            .map_err(|e| RatchetError::Decryption(e.to_string()))
    }

    /// Perform a DH ratchet step upon receiving a new DH public key
    fn dh_ratchet_step(&mut self, their_new_dh_public: &[u8; 32]) -> Result<()> {
        self.previous_chain_length = self.send_message_number;
        self.send_message_number = 0;
        self.recv_message_number = 0;
        self.their_dh_public = Some(*their_new_dh_public);

        // Receiving chain: DH(our_secret, their_new_public) → root KDF → recv chain key
        let dh_recv = key_exchange::derive_shared_secret(&self.our_dh_secret, their_new_dh_public)
            .map_err(|e| RatchetError::DHRatchetFailed(e.to_string()))?;
        let (new_root, recv_ck) = kdf_root(&self.root_key, &dh_recv);
        self.root_key = new_root;
        self.recv_chain_key = Some(recv_ck);

        // Generate new DH keypair for sending chain
        let (new_pub, new_sec) = key_exchange::generate_static_keypair();
        self.our_dh_public = new_pub;
        let mut old_secret = self.our_dh_secret;
        self.our_dh_secret = new_sec;
        old_secret.zeroize();

        // Sending chain: DH(new_secret, their_new_public) → root KDF → send chain key
        let dh_send = key_exchange::derive_shared_secret(&self.our_dh_secret, their_new_dh_public)
            .map_err(|e| RatchetError::DHRatchetFailed(e.to_string()))?;
        let (new_root2, send_ck) = kdf_root(&self.root_key, &dh_send);
        self.root_key = new_root2;
        self.send_chain_key = Some(send_ck);

        Ok(())
    }

    /// Process a KEM ratchet step from a received message
    fn process_kem_ratchet(
        &mut self,
        kem_ciphertext: &[u8],
        their_new_kem_ek: Option<&[u8]>,
    ) -> Result<()> {
        if let Some(ref our_kem) = self.our_kem_keypair {
            // Decapsulate using our KEM keypair
            let shared = pqc::hybrid_decapsulate(
                &[0u8; 32], // KEM-only step
                kem_ciphertext,
                &our_kem.x25519_secret,
                &our_kem.kyber_secret,
            ).map_err(|e: pqc::PqcError| RatchetError::KEMRatchetFailed(e.to_string()))?;

            // Mix KEM shared secret into root key
            let (new_root, new_recv_ck) = kdf_root(&self.root_key, &shared[..32]);
            self.root_key = new_root;
            self.recv_chain_key = Some(new_recv_ck);

            // Update their KEM encapsulation key if provided
            if let Some(new_ek) = their_new_kem_ek {
                self.their_kem_ek = Some(new_ek.to_vec());
            }

            // Regenerate our KEM keypair
            self.our_kem_keypair = Some(
                pqc::generate_hybrid_keypair_random()
                    .map_err(|e: pqc::PqcError| RatchetError::KEMRatchetFailed(e.to_string()))?
            );
        }
        Ok(())
    }

    /// Skip messages up to `until` and store their keys
    fn skip_messages(&mut self, until: u64) -> Result<()> {
        if let Some(ref mut recv_ck) = self.recv_chain_key {
            let to_skip = until.saturating_sub(self.recv_message_number);
            if to_skip as usize > MAX_SKIP {
                return Err(RatchetError::TooManySkipped);
            }

            let their_dh = self.their_dh_public.unwrap_or([0u8; 32]);

            for _ in 0..to_skip {
                let (new_ck, mk) = kdf_chain(recv_ck);
                self.skipped_keys.push(SkippedKey {
                    dh_public: their_dh,
                    message_number: self.recv_message_number,
                    message_key: mk,
                });
                *recv_ck = new_ck;
                self.recv_message_number += 1;
            }

            // Limit stored skipped keys
            while self.skipped_keys.len() > MAX_SKIP {
                self.skipped_keys.remove(0);
            }
        }
        Ok(())
    }

    /// Try to decrypt using a previously skipped message key
    fn try_skipped_keys(
        &mut self,
        header: &RatchetHeader,
        ciphertext: &[u8],
    ) -> Result<Option<Vec<u8>>> {
        let idx = self.skipped_keys.iter().position(|sk| {
            sk.dh_public == header.dh_public && sk.message_number == header.message_number
        });

        if let Some(idx) = idx {
            let sk = self.skipped_keys.remove(idx);
            let plaintext = encryption::decrypt_message(ciphertext, &sk.message_key)
                .map_err(|e| RatchetError::Decryption(e.to_string()))?;
            Ok(Some(plaintext))
        } else {
            Ok(None)
        }
    }

    /// Get our current DH ratchet public key (for sending in headers)
    pub fn our_dh_public_key(&self) -> &[u8; 32] {
        &self.our_dh_public
    }

    /// Get our current KEM encapsulation key (for sending to peer so they can encapsulate to us)
    pub fn our_kem_encapsulation_key(&self) -> Option<Vec<u8>> {
        self.our_kem_keypair.as_ref().map(|kp| kp.kyber_public.clone())
    }

    /// Serialize the ratchet state for persistent storage
    pub fn export_state(&self) -> RatchetState {
        RatchetState {
            root_key: self.root_key,
            send_chain_key: self.send_chain_key,
            send_message_number: self.send_message_number,
            recv_chain_key: self.recv_chain_key,
            recv_message_number: self.recv_message_number,
            our_dh_secret: self.our_dh_secret,
            our_dh_public: self.our_dh_public,
            their_dh_public: self.their_dh_public,
            their_kem_ek: self.their_kem_ek.clone(),
            total_messages_sent: self.total_messages_sent,
            previous_chain_length: self.previous_chain_length,
            our_kem_public: self.our_kem_keypair.as_ref().map(|kp| kp.kyber_public.clone()),
            our_kem_secret: self.our_kem_keypair.as_ref().map(|kp| kp.kyber_secret.clone()),
            our_kem_x25519_public: self.our_kem_keypair.as_ref().map(|kp| kp.x25519_public),
            our_kem_x25519_secret: self.our_kem_keypair.as_ref().map(|kp| kp.x25519_secret),
        }
    }

    /// Restore ratchet state from persistent storage
    pub fn import_state(state: RatchetState) -> Self {
        let our_kem_keypair = match (
            state.our_kem_public,
            state.our_kem_secret,
            state.our_kem_x25519_public,
            state.our_kem_x25519_secret,
        ) {
            (Some(pub_k), Some(sec_k), Some(x_pub), Some(x_sec)) => {
                Some(HybridKEMKeypair {
                    x25519_public: x_pub,
                    x25519_secret: x_sec,
                    kyber_public: pub_k,
                    kyber_secret: sec_k,
                })
            }
            _ => None,
        };

        PQDoubleRatchet {
            root_key: state.root_key,
            send_chain_key: state.send_chain_key,
            send_message_number: state.send_message_number,
            recv_chain_key: state.recv_chain_key,
            recv_message_number: state.recv_message_number,
            our_dh_secret: state.our_dh_secret,
            our_dh_public: state.our_dh_public,
            their_dh_public: state.their_dh_public,
            our_kem_keypair,
            their_kem_ek: state.their_kem_ek,
            total_messages_sent: state.total_messages_sent,
            previous_chain_length: state.previous_chain_length,
            skipped_keys: Vec::new(),
        }
    }
}

/// Serializable ratchet state for database persistence
#[derive(Clone, Serialize, Deserialize)]
pub struct RatchetState {
    pub root_key: [u8; 32],
    pub send_chain_key: Option<[u8; 32]>,
    pub send_message_number: u64,
    pub recv_chain_key: Option<[u8; 32]>,
    pub recv_message_number: u64,
    pub our_dh_secret: [u8; 32],
    pub our_dh_public: [u8; 32],
    pub their_dh_public: Option<[u8; 32]>,
    pub their_kem_ek: Option<Vec<u8>>,
    pub total_messages_sent: u64,
    pub previous_chain_length: u64,
    pub our_kem_public: Option<Vec<u8>>,
    pub our_kem_secret: Option<Vec<u8>>,
    pub our_kem_x25519_public: Option<[u8; 32]>,
    pub our_kem_x25519_secret: Option<[u8; 32]>,
}

// ── KDF functions ──

/// Derive initial root key from the handshake shared secret
fn kdf_root_init(shared_secret: &[u8]) -> [u8; 32] {
    blake3::derive_key("ShieldMessenger-Ratchet-RootInit-v1", shared_secret)
}

/// Root KDF: derive new root key and chain key from root key + DH/KEM output
fn kdf_root(root_key: &[u8; 32], dh_output: &[u8]) -> ([u8; 32], [u8; 32]) {
    let mut input = Vec::with_capacity(32 + dh_output.len());
    input.extend_from_slice(root_key);
    input.extend_from_slice(dh_output);

    let new_root = blake3::derive_key("ShieldMessenger-Ratchet-RootKDF-RK-v1", &input);
    let chain_key = blake3::derive_key("ShieldMessenger-Ratchet-RootKDF-CK-v1", &input);

    (new_root, chain_key)
}

/// Chain KDF: derive new chain key and message key from current chain key
fn kdf_chain(chain_key: &[u8; 32]) -> ([u8; 32], [u8; 32]) {
    let mut mac_ck = <HmacSha256 as Mac>::new_from_slice(chain_key)
        .expect("HMAC key length valid");
    mac_ck.update(&[0x01]); // 0x01 → next chain key
    let new_chain_key: [u8; 32] = mac_ck.finalize().into_bytes().into();

    let mut mac_mk = <HmacSha256 as Mac>::new_from_slice(chain_key)
        .expect("HMAC key length valid");
    mac_mk.update(&[0x02]); // 0x02 → message key
    let message_key: [u8; 32] = mac_mk.finalize().into_bytes().into();

    (new_chain_key, message_key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_ratchet_exchange() {
        // Simulate X3DH handshake producing a shared secret
        let (alice_dh_pub, alice_dh_sec) = key_exchange::generate_static_keypair();
        let (bob_dh_pub, bob_dh_sec) = key_exchange::generate_static_keypair();

        let shared_secret = key_exchange::derive_shared_secret(&alice_dh_sec, &bob_dh_pub).unwrap();
        let mut shared_64 = [0u8; 64];
        shared_64[..32].copy_from_slice(&shared_secret);
        shared_64[32..].copy_from_slice(&shared_secret);

        // Alice initializes as initiator
        let mut alice = PQDoubleRatchet::init_alice(&shared_64, &bob_dh_pub, None).unwrap();
        // Bob initializes as responder
        let mut bob = PQDoubleRatchet::init_bob(&shared_64, (bob_dh_pub, bob_dh_sec)).unwrap();

        // Alice sends message to Bob
        let (header, ct) = alice.encrypt(b"Hello Bob!").unwrap();
        let pt = bob.decrypt(&header, &ct).unwrap();
        assert_eq!(pt, b"Hello Bob!");

        // Bob replies to Alice
        let (header2, ct2) = bob.encrypt(b"Hello Alice!").unwrap();
        let pt2 = alice.decrypt(&header2, &ct2).unwrap();
        assert_eq!(pt2, b"Hello Alice!");
    }

    #[test]
    fn test_multiple_messages_same_direction() {
        let (alice_dh_pub, alice_dh_sec) = key_exchange::generate_static_keypair();
        let (bob_dh_pub, bob_dh_sec) = key_exchange::generate_static_keypair();

        let shared_secret = key_exchange::derive_shared_secret(&alice_dh_sec, &bob_dh_pub).unwrap();
        let mut shared_64 = [0u8; 64];
        shared_64[..32].copy_from_slice(&shared_secret);
        shared_64[32..].copy_from_slice(&shared_secret);

        let mut alice = PQDoubleRatchet::init_alice(&shared_64, &bob_dh_pub, None).unwrap();
        let mut bob = PQDoubleRatchet::init_bob(&shared_64, (bob_dh_pub, bob_dh_sec)).unwrap();

        // Alice sends 5 messages in a row
        let mut messages = Vec::new();
        for i in 0..5 {
            let msg = format!("Message {}", i);
            let (header, ct) = alice.encrypt(msg.as_bytes()).unwrap();
            messages.push((header, ct, msg));
        }

        // Bob decrypts all in order
        for (header, ct, expected) in &messages {
            let pt = bob.decrypt(header, ct).unwrap();
            assert_eq!(pt, expected.as_bytes());
        }
    }

    #[test]
    fn test_out_of_order_delivery() {
        let (alice_dh_pub, alice_dh_sec) = key_exchange::generate_static_keypair();
        let (bob_dh_pub, bob_dh_sec) = key_exchange::generate_static_keypair();

        let shared_secret = key_exchange::derive_shared_secret(&alice_dh_sec, &bob_dh_pub).unwrap();
        let mut shared_64 = [0u8; 64];
        shared_64[..32].copy_from_slice(&shared_secret);
        shared_64[32..].copy_from_slice(&shared_secret);

        let mut alice = PQDoubleRatchet::init_alice(&shared_64, &bob_dh_pub, None).unwrap();
        let mut bob = PQDoubleRatchet::init_bob(&shared_64, (bob_dh_pub, bob_dh_sec)).unwrap();

        // Alice sends 3 messages
        let (h0, ct0) = alice.encrypt(b"msg0").unwrap();
        let (h1, ct1) = alice.encrypt(b"msg1").unwrap();
        let (h2, ct2) = alice.encrypt(b"msg2").unwrap();

        // Bob receives message 2 first (skips 0 and 1)
        let pt2 = bob.decrypt(&h2, &ct2).unwrap();
        assert_eq!(pt2, b"msg2");

        // Bob receives message 0 (from skipped keys)
        let pt0 = bob.decrypt(&h0, &ct0).unwrap();
        assert_eq!(pt0, b"msg0");

        // Bob receives message 1 (from skipped keys)
        let pt1 = bob.decrypt(&h1, &ct1).unwrap();
        assert_eq!(pt1, b"msg1");
    }

    #[test]
    fn test_ratchet_state_export_import() {
        let (_, alice_dh_sec) = key_exchange::generate_static_keypair();
        let (bob_dh_pub, bob_dh_sec) = key_exchange::generate_static_keypair();

        let shared_secret = key_exchange::derive_shared_secret(&alice_dh_sec, &bob_dh_pub).unwrap();
        let mut shared_64 = [0u8; 64];
        shared_64[..32].copy_from_slice(&shared_secret);
        shared_64[32..].copy_from_slice(&shared_secret);

        let mut alice = PQDoubleRatchet::init_alice(&shared_64, &bob_dh_pub, None).unwrap();
        let mut bob = PQDoubleRatchet::init_bob(&shared_64, (bob_dh_pub, bob_dh_sec)).unwrap();

        // Send a message
        let (h, ct) = alice.encrypt(b"test").unwrap();
        let _ = bob.decrypt(&h, &ct).unwrap();

        // Export and re-import Alice's state
        let state = alice.export_state();
        let serialized = bincode::serialize(&state).unwrap();
        let deserialized: RatchetState = bincode::deserialize(&serialized).unwrap();
        let mut alice_restored = PQDoubleRatchet::import_state(deserialized);

        // Alice (restored) can still send
        let (h2, ct2) = alice_restored.encrypt(b"after restore").unwrap();
        let pt2 = bob.decrypt(&h2, &ct2).unwrap();
        assert_eq!(pt2, b"after restore");
    }

    #[test]
    fn test_kdf_chain_deterministic() {
        let ck = [0xABu8; 32];
        let (ck1, mk1) = kdf_chain(&ck);
        let (ck2, mk2) = kdf_chain(&ck);
        assert_eq!(ck1, ck2);
        assert_eq!(mk1, mk2);
        assert_ne!(ck1, mk1); // chain key ≠ message key
    }
}
