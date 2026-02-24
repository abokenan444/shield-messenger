//! Plausible Deniability and Duress PIN (app-layer interface)
//!
//! This module defines the contract for deniable encryption storage and Duress PIN.
//! The actual database (e.g. SQLCipher) is implemented by the application; the core
//! provides types and semantics so that:
//!
//! 1. **Deniable encryption:** Without the key, stored data is indistinguishable from random.
//! 2. **Duress PIN:** A second PIN that, when entered, wipes real data and optionally
//!    presents a plausible fake database (e.g. empty or pre-generated fake conversations).

use std::fmt;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Decryption failed (wrong key or corrupted)")]
    DecryptionFailed,
    #[error("Duress PIN triggered")]
    DuressTriggered,
    #[error("Storage I/O error")]
    Io,
}

/// Result of a storage operation (app layer implements the actual DB).
pub type Result<T> = std::result::Result<T, StorageError>;

/// Deniable storage contract: the app should ensure that without the correct key,
/// the raw bytes on disk are indistinguishable from random (e.g. SQLCipher with
/// HMAC and no plaintext length leakage where possible).
///
/// This trait is implemented by the application (Android/iOS/Web), not by the core.
#[doc(hidden)]
pub trait DeniableStorage {
    /// Open or create the store with the given key. If key is wrong, read operations
    /// should fail or return indistinguishable garbage.
    fn open_with_key(&mut self, key: &[u8]) -> Result<()>; // app implements

    /// Wipe all sensitive data and zeroize the key. After this, the store is empty
    /// or replaced with a fake layer (see Duress PIN).
    fn wipe_and_zeroize(&mut self) -> Result<()>; // app implements
}

/// Duress PIN behavior (for app implementation).
///
/// When the user enters the Duress PIN instead of the real PIN:
/// 1. The app MUST immediately wipe all real data (messages, keys, contacts).
/// 2. The app MAY replace the database with a plausible fake (e.g. empty chats or
///    pre-generated fake conversations) so that the device still "looks like" a
///    normal messenger.
/// 3. The app MUST NOT persist the real encryption key after wipe; the real key
///    MUST be zeroized from memory.
///
/// The core does not implement Duress PIN; it only documents this contract so that
/// the app can implement it consistently (e.g. in the same way as Wickr/Cwtch).
#[derive(Debug, Clone)]
pub struct DuressPinSpec {
    /// If true, after wipe the app should show a fake DB (e.g. empty or pre-generated).
    pub show_plausible_fake: bool,
    /// Optional: path or identifier for a pre-generated fake DB to replace the real one.
    pub fake_db_path: Option<String>,
}

impl Default for DuressPinSpec {
    fn default() -> Self {
        Self {
            show_plausible_fake: true,
            fake_db_path: None,
        }
    }
}

impl fmt::Display for DuressPinSpec {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "DuressPinSpec(show_fake={}, fake_db={:?})",
            self.show_plausible_fake,
            self.fake_db_path
        )
    }
}

/// When the app detects Duress PIN entry, it should:
/// 1. Call `on_duress_pin_entered()` so the core clears in-memory sensitive state.
/// 2. Zeroize the real encryption key from memory (app responsibility).
/// 3. Wipe the real database (or overwrite with random) (app responsibility).
/// 4. If `spec.show_plausible_fake` is true, replace with a fake DB (app responsibility).

/// Call this when the user has entered the Duress PIN. The core will clear in-memory
/// sensitive state (e.g. pending ratchet keys). The app must then wipe the database
/// and optionally present a plausible fake DB.
pub fn on_duress_pin_entered() -> Result<()> {
    crate::crypto::encryption::clear_all_pending_ratchets_for_duress()
        .map_err(|_| StorageError::Io)
}
