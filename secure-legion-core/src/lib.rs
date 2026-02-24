pub mod crypto;
pub mod protocol;
#[cfg(not(target_arch = "wasm32"))]
pub mod network;
pub mod nlx402;
#[cfg(feature = "audio-codec")]
pub mod audio;
pub mod ffi;
#[cfg(not(target_arch = "wasm32"))]
pub mod crdt;
pub mod storage;

// Re-export main types
pub use crypto::{
    encrypt_message, decrypt_message,
    sign_data, verify_signature, generate_keypair,
    derive_shared_secret, hash_password, hash_handle,
};

pub use protocol::{Message, ContactCard, SecurityMode, MessageType};
#[cfg(not(target_arch = "wasm32"))]
pub use network::{PingToken, PongToken, PingPongManager, TorManager};
pub use nlx402::{PaymentQuote, create_quote, verify_payment, verify_payment_simple, extract_quote_hash_from_memo, VerificationResult};
pub use storage::{
    DuressPinSpec, StorageError, StealthModeSpec, DecoyConfig,
    DecoyContact, DecoyMessage, generate_decoy_data, on_duress_pin_entered,
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
