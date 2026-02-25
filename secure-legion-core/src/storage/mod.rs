//! Plausible Deniability, Duress PIN, Decoy Generation, and Stealth Mode.
//!
//! This module defines the contract for deniable encryption storage and Duress PIN.
//! The actual database (e.g. SQLCipher) is implemented by the application; the core
//! provides types, decoy generation, and semantics so that:
//!
//! 1. **Deniable encryption:** Without the key, stored data is indistinguishable from random.
//! 2. **Duress PIN:** A second PIN that, when entered, wipes real data and presents a
//!    plausible fake database (decoy conversations and contacts).
//! 3. **Stealth mode:** Optional app-layer behavior to hide the app icon after duress.

use getrandom::getrandom;
use std::fmt;
use thiserror::Error;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Decryption failed (wrong key or corrupted)")]
    DecryptionFailed,
    #[error("Duress PIN triggered")]
    DuressTriggered,
    #[error("Storage I/O error")]
    Io,
}

pub type Result<T> = std::result::Result<T, StorageError>;

// ---------------------------------------------------------------------------
// Deniable storage contract (app implements)
// ---------------------------------------------------------------------------

/// Deniable storage contract: without the correct key, raw bytes on disk are
/// indistinguishable from random (e.g. SQLCipher with HMAC, no plaintext length leakage).
pub trait DeniableStorage {
    fn open_with_key(&mut self, key: &[u8]) -> Result<()>;
    fn wipe_and_zeroize(&mut self) -> Result<()>;
}

// ---------------------------------------------------------------------------
// Contact trust-level persistence contract (app implements)
// ---------------------------------------------------------------------------

use crate::crypto::pqc::ContactVerificationRecord;

/// Contract for persisting contact verification / trust-level state.
///
/// The application layer (SQLCipher on mobile, IndexedDB on web) MUST implement
/// this trait so that trust levels survive app restarts.
///
/// Schema hint for SQLCipher:
/// ```sql
/// CREATE TABLE IF NOT EXISTS contact_trust (
///   contact_id    TEXT PRIMARY KEY,
///   trust_level   INTEGER NOT NULL DEFAULT 1,
///   verified_at   INTEGER NOT NULL DEFAULT 0,
///   safety_number TEXT NOT NULL DEFAULT ''
/// );
/// ```
pub trait ContactTrustStore {
    /// Load the verification record for a contact. Returns `None` if the
    /// contact has never been seen (i.e. brand-new / Level 0).
    fn load_trust(&self, contact_id: &str) -> Result<Option<ContactVerificationRecord>>;

    /// Persist (insert or update) a contact's verification record.
    fn save_trust(&mut self, record: &ContactVerificationRecord) -> Result<()>;

    /// Delete the verification record (e.g. when removing a contact).
    fn delete_trust(&mut self, contact_id: &str) -> Result<()>;

    /// List all contacts that have been verified (Level 2).
    fn list_verified(&self) -> Result<Vec<ContactVerificationRecord>>;
}

// ---------------------------------------------------------------------------
// Duress PIN specification
// ---------------------------------------------------------------------------

/// Duress PIN behavior:
/// 1. App MUST immediately wipe all real data (messages, keys, contacts).
/// 2. App MUST call `on_duress_pin_entered()` so core clears in-memory state.
/// 3. App MAY populate a decoy database (see `DecoyGenerator`).
/// 4. App MAY activate stealth mode (see `StealthModeSpec`).
/// 5. Real encryption key MUST be zeroized from memory — never persisted after wipe.
#[derive(Debug, Clone)]
pub struct DuressPinSpec {
    pub show_plausible_fake: bool,
    pub fake_db_path: Option<String>,
    pub stealth_mode: StealthModeSpec,
    pub decoy_config: DecoyConfig,
}

impl Default for DuressPinSpec {
    fn default() -> Self {
        Self {
            show_plausible_fake: true,
            fake_db_path: None,
            stealth_mode: StealthModeSpec::default(),
            decoy_config: DecoyConfig::default(),
        }
    }
}

impl fmt::Display for DuressPinSpec {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "DuressPinSpec(show_fake={}, stealth={}, decoy_contacts={})",
            self.show_plausible_fake,
            self.stealth_mode.hide_app_icon,
            self.decoy_config.contact_count
        )
    }
}

// ---------------------------------------------------------------------------
// Stealth mode
// ---------------------------------------------------------------------------

/// Stealth mode: optionally hide the app icon / launcher alias after duress.
/// Implementation is app-layer (e.g. Android ComponentName disable, iOS app clip).
#[derive(Debug, Clone)]
pub struct StealthModeSpec {
    /// If true, the app should hide its launcher icon after duress.
    pub hide_app_icon: bool,
    /// Optional: alias component name for Android launcher icon toggle.
    pub launcher_alias: Option<String>,
}

impl Default for StealthModeSpec {
    fn default() -> Self {
        Self {
            hide_app_icon: false,
            launcher_alias: None,
        }
    }
}

// ---------------------------------------------------------------------------
// Decoy database generation
// ---------------------------------------------------------------------------

/// Configuration for generating plausible decoy data.
#[derive(Debug, Clone)]
pub struct DecoyConfig {
    /// Number of fake contacts to generate.
    pub contact_count: u16,
    /// Number of fake messages per contact.
    pub messages_per_contact: u16,
    /// Minimum message length (bytes) for fake messages.
    pub min_message_len: u16,
    /// Maximum message length (bytes) for fake messages.
    pub max_message_len: u16,
}

impl Default for DecoyConfig {
    fn default() -> Self {
        Self {
            contact_count: 5,
            messages_per_contact: 20,
            min_message_len: 10,
            max_message_len: 200,
        }
    }
}

/// A single decoy contact for the fake database.
#[derive(Debug, Clone)]
pub struct DecoyContact {
    pub display_name: String,
    /// Fake .onion address (random, not real).
    pub onion_address: String,
    /// Fake messages for this contact.
    pub messages: Vec<DecoyMessage>,
}

/// A single decoy message.
#[derive(Debug, Clone)]
pub struct DecoyMessage {
    /// Random realistic-looking content (base64-ish).
    pub content: String,
    /// Unix timestamp (randomized within last 7 days).
    pub timestamp: i64,
    /// true = "sent by us", false = "received"
    pub is_outgoing: bool,
}

/// Generate a set of decoy contacts and messages that look plausible.
/// The app should insert these into the (new, empty) SQLCipher DB after wiping the real one.
pub fn generate_decoy_data(config: &DecoyConfig) -> Vec<DecoyContact> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let names = [
        "Alex", "Sam", "Jordan", "Taylor", "Morgan",
        "Casey", "Quinn", "Riley", "Avery", "Jamie",
        "Charlie", "Dakota", "Emery", "Finley", "Harper",
    ];

    let mut contacts = Vec::with_capacity(config.contact_count as usize);

    for i in 0..config.contact_count {
        let name_idx = (i as usize) % names.len();
        let display_name = format!("{} {}", names[name_idx], random_suffix());

        let onion_address = generate_fake_onion();

        let mut messages = Vec::with_capacity(config.messages_per_contact as usize);
        for _ in 0..config.messages_per_contact {
            let ts_offset = random_range(0, 7 * 24 * 3600);
            let timestamp = now - ts_offset as i64;
            let msg_len = random_range(
                config.min_message_len as u32,
                config.max_message_len as u32,
            ) as usize;
            let content = random_text(msg_len);
            let is_outgoing = random_bool();
            messages.push(DecoyMessage { content, timestamp, is_outgoing });
        }

        messages.sort_by_key(|m| m.timestamp);

        contacts.push(DecoyContact { display_name, onion_address, messages });
    }

    contacts
}

// ---------------------------------------------------------------------------
// Core duress entry point
// ---------------------------------------------------------------------------

/// Call when the user has entered the Duress PIN. Clears in-memory sensitive state
/// (pending ratchet keys, etc.). The app must then:
/// 1. Wipe the real database.
/// 2. Zeroize the real encryption key from memory.
/// 3. Optionally call `generate_decoy_data()` and populate a new fake DB.
/// 4. Optionally activate stealth mode.
pub fn on_duress_pin_entered() -> Result<()> {
    crate::crypto::encryption::clear_all_pending_ratchets_for_duress()
        .map_err(|_| StorageError::Io)?;
    log::info!("Duress PIN: core sensitive state cleared");
    Ok(())
}

// ---------------------------------------------------------------------------
// Random helpers (deterministic from getrandom, no external dependency)
// ---------------------------------------------------------------------------

fn random_range(min: u32, max: u32) -> u32 {
    if min >= max { return min; }
    let mut buf = [0u8; 4];
    let _ = getrandom(&mut buf);
    let v = u32::from_ne_bytes(buf);
    min + (v % (max - min))
}

fn random_bool() -> bool {
    let mut buf = [0u8; 1];
    let _ = getrandom(&mut buf);
    buf[0] & 1 == 1
}

fn random_suffix() -> String {
    let mut buf = [0u8; 2];
    let _ = getrandom(&mut buf);
    format!("{:02x}{:02x}", buf[0], buf[1])
}

fn generate_fake_onion() -> String {
    let mut buf = [0u8; 35];
    let _ = getrandom(&mut buf);
    let encoded = base32::encode(base32::Alphabet::Rfc4648 { padding: false }, &buf)
        .to_lowercase();
    format!("{}.onion", encoded)
}

fn random_text(len: usize) -> String {
    let charset = b"abcdefghijklmnopqrstuvwxyz .!?,";
    let mut buf = vec![0u8; len];
    let _ = getrandom(&mut buf);
    buf.iter().map(|b| charset[(*b as usize) % charset.len()] as char).collect()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_duress_spec() {
        let spec = DuressPinSpec::default();
        assert!(spec.show_plausible_fake);
        assert!(!spec.stealth_mode.hide_app_icon);
        assert_eq!(spec.decoy_config.contact_count, 5);
    }

    #[test]
    fn test_generate_decoy_data() {
        let config = DecoyConfig {
            contact_count: 3,
            messages_per_contact: 5,
            min_message_len: 10,
            max_message_len: 50,
        };
        let contacts = generate_decoy_data(&config);
        assert_eq!(contacts.len(), 3);
        for c in &contacts {
            assert!(!c.display_name.is_empty());
            assert!(c.onion_address.ends_with(".onion"));
            assert_eq!(c.messages.len(), 5);
            for m in &c.messages {
                assert!(m.content.len() >= 10 && m.content.len() <= 50);
                assert!(m.timestamp > 0);
            }
            // Messages should be sorted by timestamp
            for w in c.messages.windows(2) {
                assert!(w[0].timestamp <= w[1].timestamp);
            }
        }
    }

    #[test]
    fn test_generate_fake_onion() {
        let onion = generate_fake_onion();
        assert!(onion.ends_with(".onion"));
        assert!(onion.len() > 20);
    }

    #[test]
    fn test_on_duress_pin() {
        assert!(on_duress_pin_entered().is_ok());
    }
}
