//! # Shield Protocol SDK
//!
//! **A post-quantum, metadata-zero, end-to-end encrypted messaging protocol.**
//!
//! Shield Protocol is a standalone cryptographic protocol library — similar to
//! how [Signal Protocol](https://signal.org/docs/) powers WhatsApp, Facebook
//! Messenger, and Skype.  Any developer can integrate Shield Protocol into their
//! own application to gain:
//!
//! - **Post-quantum key agreement** (X25519 + ML-KEM-1024 hybrid)
//! - **Double-ratchet with PQ ratchet steps** (forward secrecy + post-compromise security)
//! - **Traffic-analysis resistance** (fixed-size packets, cover traffic, random delays)
//! - **Group messaging via CRDTs** (conflict-free replicated data types)
//! - **Plausible deniability** (duress PIN, decoy databases, stealth mode)
//! - **Zero-knowledge proofs** (Bulletproof range proofs)
//!
//! ## Quick Start
//!
//! ```rust
//! use shield_protocol::crypto::{generate_keypair, encrypt_message, decrypt_message};
//! use shield_protocol::crypto::pqc::generate_hybrid_keypair_random;
//!
//! // Generate classical + post-quantum key pairs
//! let (public_key, secret_key) = generate_keypair();
//! let hybrid_kp = generate_hybrid_keypair_random();
//! ```
//!
//! ## Architecture
//!
//! | Module | Purpose |
//! |--------|---------|
//! | [`crypto`] | Encryption, signing, key exchange, PQ ratchet, replay cache, ZK proofs |
//! | [`protocol`] | Message types, contact cards, security modes |
//! | [`transport`] | Fixed-size packets, padding, cover traffic, traffic shaping |
//! | [`storage`] | Deniable storage traits, duress PIN, decoy generation |
//! | [`crdt`] | CRDT-based group messaging (operation log, membership, metadata) |
//!
//! ## Feature Flags
//!
//! | Feature | Default | Description |
//! |---------|---------|-------------|
//! | `std` | Yes | Standard library support |
//! | `groups` | Yes | CRDT group messaging (adds `ciborium` for CBOR encoding) |
//! | `wasm` | No | WebAssembly support (`getrandom/js`) |

// Crate-level lint configuration — suppress stylistic warnings that don't affect correctness.
// Security-relevant lints (unsafe, unchecked, etc.) remain enforced.
#![allow(
    clippy::empty_line_after_doc_comments,
    clippy::doc_lazy_continuation,
    clippy::too_many_arguments,
    clippy::type_complexity,
    clippy::inherent_to_string,
    clippy::manual_strip,
    clippy::needless_range_loop,
    clippy::await_holding_lock,
    dead_code,
    unused_assignments
)]

// ── Public modules ──────────────────────────────────────────────────────────

/// Cryptographic primitives: encryption, signing, key exchange, PQ ratchet,
/// replay cache, zero-knowledge proofs, backup & recovery, duress.
pub mod crypto;

/// Message format, contact cards, and security modes.
pub mod protocol;

/// Transport-layer primitives: fixed-size packets, padding, cover traffic.
pub mod transport;

/// Deniable storage contract, duress PIN semantics, and decoy generation.
pub mod storage;

/// CRDT-based group messaging — conflict-free replicated data types for
/// invite, message, edit, delete, react, and metadata operations.
#[cfg(feature = "groups")]
pub mod crdt;

// ── Re-exports for convenience ──────────────────────────────────────────────

pub use crypto::{
    decrypt_message, derive_shared_secret, encrypt_message, generate_keypair, hash_handle,
    hash_password, sign_data, verify_signature,
};

pub use protocol::{ContactCard, Message, MessageType, SecurityMode};

pub use storage::{
    generate_decoy_data, on_duress_pin_entered, DecoyConfig, DecoyContact, DecoyMessage,
    DuressPinSpec, StealthModeSpec, StorageError,
};

pub use transport::{
    pad_to_fixed_size, strip_padding, generate_cover_packet, is_cover_packet,
    Packet, PacketType, PaddingError,
};

// ── Library metadata ────────────────────────────────────────────────────────

/// Shield Protocol SDK version.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Returns the SDK version string.
pub fn version() -> &'static str {
    VERSION
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert!(!version().is_empty());
        assert!(version().contains('.'));
    }

    #[test]
    fn test_keypair_generation() {
        let (pk, _sk) = generate_keypair();
        assert_eq!(pk.len(), 32);
    }

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = [0x42u8; 32];
        let plaintext = b"Hello, Shield Protocol!";
        let encrypted = encrypt_message(plaintext, &key).expect("encrypt");
        let decrypted = decrypt_message(&encrypted, &key).expect("decrypt");
        assert_eq!(decrypted, plaintext);
    }
}
