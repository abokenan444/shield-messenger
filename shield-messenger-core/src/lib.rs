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

// ── Re-export Shield Protocol SDK modules ───────────────────────────────────
// These modules now live in the standalone `shield-protocol` crate.
// We re-export them here so that all existing `crate::crypto::…`,
// `crate::protocol::…`, etc. references continue to compile unchanged.
pub use shield_protocol::crypto;
pub use shield_protocol::protocol;
pub use shield_protocol::storage;
pub use shield_protocol::transport;

#[cfg(not(target_arch = "wasm32"))]
pub use shield_protocol::crdt;

// ── Local modules (app-layer, not part of the standalone protocol) ──────────
#[cfg(feature = "audio-codec")]
pub mod audio;
pub mod ffi;
#[cfg(not(target_arch = "wasm32"))]
pub mod network;
pub mod nlx402;

// ── Re-export main types (backward-compatible) ─────────────────────────────
pub use crypto::{
    decrypt_message, derive_shared_secret, encrypt_message, generate_keypair, hash_handle,
    hash_password, sign_data, verify_signature,
};

#[cfg(not(target_arch = "wasm32"))]
pub use network::{PingPongManager, PingToken, PongToken, TorManager};
pub use nlx402::{
    create_quote, extract_quote_hash_from_memo, verify_payment, verify_payment_simple,
    PaymentQuote, VerificationResult,
};
pub use protocol::{ContactCard, Message, MessageType, SecurityMode};
pub use storage::{
    generate_decoy_data, on_duress_pin_entered, DecoyConfig, DecoyContact, DecoyMessage,
    DuressPinSpec, StealthModeSpec, StorageError,
};

// Library version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Get library version
pub fn get_version() -> &'static str {
    VERSION
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        let version = get_version();
        assert!(!version.is_empty());
    }
}
