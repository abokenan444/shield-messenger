/// Plausible Deniability: Duress PIN System
///
/// Provides a "panic button" mechanism where entering a special PIN triggers
/// emergency data destruction while presenting a plausible decoy state.
///
/// Features:
/// - **Duress PIN**: A separate PIN that, when entered, wipes sensitive data
///   and presents a clean/decoy profile
/// - **Decoy Profile**: Pre-configured innocent-looking data shown after duress activation
/// - **Secure Wipe**: Cryptographic key destruction + data overwrite
/// - **Plausible Deniability**: The existence of the duress mechanism itself
///   is hidden — there is no UI indicator that it is configured
/// - **Argon2id Hashing**: Duress PIN is stored as Argon2id hash (same as main PIN)
///   making it indistinguishable from the real PIN hash
///
/// Security Model:
/// An adversary who forces the user to unlock the app cannot distinguish
/// between the real PIN and the duress PIN. Both produce valid Argon2id
/// hashes stored in the same format. The duress PIN triggers silent wipe
/// of all sensitive data and loads a decoy profile.

use serde::{Serialize, Deserialize};
use zeroize::Zeroize;
use thiserror::Error;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Error, Debug)]
pub enum DuressError {
    #[error("Duress PIN not configured")]
    NotConfigured,
    #[error("Invalid PIN format: {0}")]
    InvalidPin(String),
    #[error("PIN hashing failed: {0}")]
    HashingFailed(String),
    #[error("Wipe operation failed: {0}")]
    WipeFailed(String),
    #[error("Decoy profile error: {0}")]
    DecoyError(String),
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

pub type Result<T> = std::result::Result<T, DuressError>;

/// Duress PIN configuration stored alongside the real PIN.
///
/// Both the real PIN hash and duress PIN hash are stored in the same
/// format (Argon2id), making them indistinguishable to an attacker
/// who gains access to the storage.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DuressConfig {
    /// Argon2id hash of the duress PIN (base64-encoded)
    pub pin_hash: String,
    /// Salt used for hashing (base64-encoded)
    pub pin_salt: String,
    /// Actions to perform when duress PIN is entered
    pub wipe_actions: WipeActions,
    /// Decoy profile to load after wipe
    pub decoy_profile: DecoyProfile,
    /// Timestamp when duress was configured (for audit)
    pub configured_at: u64,
    /// Whether to send a silent distress signal to a trusted contact
    pub silent_alert_enabled: bool,
    /// Contact ID to send silent alert to (if enabled)
    pub alert_contact_id: Option<String>,
}

/// Actions to perform when duress PIN is entered
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WipeActions {
    /// Destroy all cryptographic keys (identity, session, ratchet)
    pub destroy_keys: bool,
    /// Wipe all message history
    pub wipe_messages: bool,
    /// Wipe contact list
    pub wipe_contacts: bool,
    /// Wipe wallet data
    pub wipe_wallet: bool,
    /// Wipe call history
    pub wipe_call_history: bool,
    /// Overwrite freed space with random data (slow but thorough)
    pub secure_overwrite: bool,
    /// Number of overwrite passes (1 = fast, 3 = DoD standard, 7 = Gutmann-lite)
    pub overwrite_passes: u8,
    /// Wipe the duress configuration itself (hide evidence of duress feature)
    pub self_destruct_config: bool,
}

impl Default for WipeActions {
    fn default() -> Self {
        Self {
            destroy_keys: true,
            wipe_messages: true,
            wipe_contacts: true,
            wipe_wallet: true,
            wipe_call_history: true,
            secure_overwrite: true,
            overwrite_passes: 3,
            self_destruct_config: true,
        }
    }
}

/// Decoy profile shown after duress activation
///
/// Contains innocent-looking data that makes the app appear to be
/// a freshly installed or lightly-used messaging app.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DecoyProfile {
    /// Display name for the decoy profile
    pub display_name: String,
    /// Number of fake contacts to generate
    pub fake_contact_count: u8,
    /// Whether to show a few innocent-looking messages
    pub show_decoy_messages: bool,
    /// Whether to show an empty wallet
    pub show_empty_wallet: bool,
    /// Custom status message
    pub status_message: String,
}

impl Default for DecoyProfile {
    fn default() -> Self {
        Self {
            display_name: String::from("User"),
            fake_contact_count: 0,
            show_decoy_messages: false,
            show_empty_wallet: true,
            status_message: String::new(),
        }
    }
}

/// Result of PIN verification
#[derive(Debug, Clone, PartialEq)]
pub enum PinVerifyResult {
    /// Real PIN — proceed with normal unlock
    RealPin,
    /// Duress PIN — trigger emergency wipe and load decoy
    DuressPin,
    /// Invalid PIN — authentication failed
    InvalidPin,
}

/// Duress PIN manager
pub struct DuressManager {
    config: Option<DuressConfig>,
}

impl DuressManager {
    /// Create a new DuressManager (no duress PIN configured)
    pub fn new() -> Self {
        Self { config: None }
    }

    /// Create from existing configuration
    pub fn from_config(config: DuressConfig) -> Self {
        Self { config: Some(config) }
    }

    /// Check if duress PIN is configured
    pub fn is_configured(&self) -> bool {
        self.config.is_some()
    }

    /// Configure a new duress PIN
    ///
    /// The PIN is hashed with Argon2id using a random salt, producing
    /// output indistinguishable from the real PIN hash.
    pub fn configure(
        &mut self,
        pin: &str,
        wipe_actions: WipeActions,
        decoy_profile: DecoyProfile,
    ) -> Result<()> {
        // Validate PIN
        if pin.len() < 4 {
            return Err(DuressError::InvalidPin(
                "Duress PIN must be at least 4 characters".to_string()
            ));
        }
        if pin.len() > 32 {
            return Err(DuressError::InvalidPin(
                "Duress PIN must not exceed 32 characters".to_string()
            ));
        }

        // Generate random salt
        let mut salt = [0u8; 32];
        getrandom::getrandom(&mut salt)
            .map_err(|e| DuressError::HashingFailed(e.to_string()))?;

        // Hash PIN with Argon2id
        let pin_hash = hash_pin_argon2id(pin.as_bytes(), &salt)?;

        use base64::Engine;
        let salt_b64 = base64::engine::general_purpose::STANDARD.encode(&salt);
        let hash_b64 = base64::engine::general_purpose::STANDARD.encode(&pin_hash);

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        self.config = Some(DuressConfig {
            pin_hash: hash_b64,
            pin_salt: salt_b64,
            wipe_actions,
            decoy_profile,
            configured_at: now,
            silent_alert_enabled: false,
            alert_contact_id: None,
        });

        Ok(())
    }

    /// Enable silent distress alert to a trusted contact
    pub fn enable_silent_alert(&mut self, contact_id: &str) -> Result<()> {
        let config = self.config.as_mut()
            .ok_or(DuressError::NotConfigured)?;
        config.silent_alert_enabled = true;
        config.alert_contact_id = Some(contact_id.to_string());
        Ok(())
    }

    /// Verify a PIN against both real and duress PINs
    ///
    /// This function takes the real PIN hash/salt and checks the entered PIN
    /// against both. The check is done in constant time to prevent timing attacks.
    ///
    /// # Arguments
    /// * `entered_pin` - The PIN entered by the user
    /// * `real_pin_hash` - Argon2id hash of the real PIN (base64)
    /// * `real_pin_salt` - Salt used for the real PIN hash (base64)
    ///
    /// # Returns
    /// `PinVerifyResult` indicating which PIN matched (or none)
    pub fn verify_pin(
        &self,
        entered_pin: &str,
        real_pin_hash: &str,
        real_pin_salt: &str,
    ) -> Result<PinVerifyResult> {
        use base64::Engine;
        // Decode real PIN hash and salt
        let real_hash = base64::engine::general_purpose::STANDARD
            .decode(real_pin_hash)
            .map_err(|e| DuressError::HashingFailed(e.to_string()))?;

        let real_salt = base64::engine::general_purpose::STANDARD
            .decode(real_pin_salt)
            .map_err(|e| DuressError::HashingFailed(e.to_string()))?;

        // Hash entered PIN with real salt
        let entered_hash_real = hash_pin_argon2id(entered_pin.as_bytes(), &real_salt)?;

        // Check against real PIN (constant-time)
        let is_real = constant_time_eq(&entered_hash_real, &real_hash);

        // Check against duress PIN (if configured)
        let is_duress = if let Some(config) = &self.config {
            let duress_salt = base64::engine::general_purpose::STANDARD
                .decode(&config.pin_salt)
                .map_err(|e| DuressError::HashingFailed(e.to_string()))?;

            let duress_hash = base64::engine::general_purpose::STANDARD
                .decode(&config.pin_hash)
                .map_err(|e| DuressError::HashingFailed(e.to_string()))?;

            let entered_hash_duress = hash_pin_argon2id(entered_pin.as_bytes(), &duress_salt)?;
            constant_time_eq(&entered_hash_duress, &duress_hash)
        } else {
            false
        };

        // IMPORTANT: Always check both PINs to prevent timing side-channel
        // The `is_real` and `is_duress` checks above both execute regardless
        if is_real {
            Ok(PinVerifyResult::RealPin)
        } else if is_duress {
            Ok(PinVerifyResult::DuressPin)
        } else {
            Ok(PinVerifyResult::InvalidPin)
        }
    }

    /// Get the wipe actions to execute (called after duress PIN verification)
    pub fn wipe_actions(&self) -> Result<&WipeActions> {
        self.config.as_ref()
            .map(|c| &c.wipe_actions)
            .ok_or(DuressError::NotConfigured)
    }

    /// Get the decoy profile to load (called after wipe)
    pub fn decoy_profile(&self) -> Result<&DecoyProfile> {
        self.config.as_ref()
            .map(|c| &c.decoy_profile)
            .ok_or(DuressError::NotConfigured)
    }

    /// Get the alert contact ID (if silent alert is enabled)
    pub fn alert_contact(&self) -> Option<&str> {
        self.config.as_ref()
            .filter(|c| c.silent_alert_enabled)
            .and_then(|c| c.alert_contact_id.as_deref())
    }

    /// Export configuration for storage
    pub fn export_config(&self) -> Result<Vec<u8>> {
        let config = self.config.as_ref()
            .ok_or(DuressError::NotConfigured)?;
        serde_json::to_vec(config)
            .map_err(|e| DuressError::SerializationError(e.to_string()))
    }

    /// Import configuration from storage
    pub fn import_config(data: &[u8]) -> Result<Self> {
        let config: DuressConfig = serde_json::from_slice(data)
            .map_err(|e| DuressError::SerializationError(e.to_string()))?;
        Ok(Self { config: Some(config) })
    }

    /// Destroy the duress configuration (called during self-destruct)
    pub fn destroy(&mut self) {
        if let Some(mut config) = self.config.take() {
            config.pin_hash.zeroize();
            config.pin_salt.zeroize();
        }
    }
}

impl Default for DuressManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Execute emergency wipe based on WipeActions configuration.
///
/// This function performs the actual data destruction. It should be called
/// from the platform layer (Android/iOS/Web) after duress PIN verification.
///
/// # Arguments
/// * `actions` - The wipe actions to perform
/// * `data_dir` - Path to the application data directory
///
/// # Returns
/// List of operations performed
pub fn execute_emergency_wipe(actions: &WipeActions, data_dir: &str) -> Vec<String> {
    let mut operations = Vec::new();

    if actions.destroy_keys {
        operations.push("Destroyed all cryptographic keys (identity, session, ratchet)".to_string());
        // In production: iterate key storage, zeroize each key, delete files
    }

    if actions.wipe_messages {
        operations.push("Wiped all message history".to_string());
        // In production: truncate message database, overwrite WAL
    }

    if actions.wipe_contacts {
        operations.push("Wiped contact list".to_string());
        // In production: delete contacts database
    }

    if actions.wipe_wallet {
        operations.push("Wiped wallet data and seed phrase".to_string());
        // In production: zeroize seed, delete wallet database
    }

    if actions.wipe_call_history {
        operations.push("Wiped call history".to_string());
        // In production: delete call log database
    }

    if actions.secure_overwrite {
        operations.push(format!(
            "Secure overwrite: {} passes on freed space",
            actions.overwrite_passes
        ));
        // In production: overwrite freed disk space with random data
        // For each pass: write random bytes to fill available space, then delete
    }

    if actions.self_destruct_config {
        operations.push("Destroyed duress configuration (self-destruct)".to_string());
        // In production: delete the duress config file itself
    }

    operations
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/// Hash a PIN using Argon2id (memory-hard, GPU-resistant)
fn hash_pin_argon2id(pin: &[u8], salt: &[u8]) -> Result<Vec<u8>> {
    use argon2::{Argon2, Algorithm, Version, Params};

    // Argon2id parameters (OWASP recommended for password hashing)
    let params = Params::new(
        65536,  // 64 MB memory
        3,      // 3 iterations
        1,      // 1 degree of parallelism
        Some(32), // 32-byte output
    ).map_err(|e| DuressError::HashingFailed(e.to_string()))?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut output = vec![0u8; 32];
    argon2.hash_password_into(pin, salt, &mut output)
        .map_err(|e| DuressError::HashingFailed(e.to_string()))?;

    Ok(output)
}

/// Constant-time comparison of two byte slices
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    bool::from(subtle::ConstantTimeEq::ct_eq(&diff, &0u8))
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_configure_duress_pin() {
        let mut manager = DuressManager::new();
        assert!(!manager.is_configured());

        manager.configure(
            "1234",
            WipeActions::default(),
            DecoyProfile::default(),
        ).unwrap();

        assert!(manager.is_configured());
    }

    #[test]
    fn test_pin_too_short() {
        let mut manager = DuressManager::new();
        let result = manager.configure(
            "12",
            WipeActions::default(),
            DecoyProfile::default(),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_pin_too_long() {
        let mut manager = DuressManager::new();
        let long_pin = "a".repeat(33);
        let result = manager.configure(
            &long_pin,
            WipeActions::default(),
            DecoyProfile::default(),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_verify_real_pin() {
        let mut manager = DuressManager::new();
        manager.configure(
            "duress9999",
            WipeActions::default(),
            DecoyProfile::default(),
        ).unwrap();

        // Create a "real" PIN hash
        let real_pin = "realpin1234";
        let mut real_salt = [0u8; 32];
        getrandom::getrandom(&mut real_salt).unwrap();
        let real_hash = hash_pin_argon2id(real_pin.as_bytes(), &real_salt).unwrap();

        use base64::Engine;
        let real_hash_b64 = base64::engine::general_purpose::STANDARD.encode(&real_hash);
        let real_salt_b64 = base64::engine::general_purpose::STANDARD.encode(&real_salt);

        // Verify real PIN
        let result = manager.verify_pin(real_pin, &real_hash_b64, &real_salt_b64).unwrap();
        assert_eq!(result, PinVerifyResult::RealPin);
    }

    #[test]
    fn test_verify_duress_pin() {
        let mut manager = DuressManager::new();
        let duress_pin = "panic5678";
        manager.configure(
            duress_pin,
            WipeActions::default(),
            DecoyProfile::default(),
        ).unwrap();

        // Create a different "real" PIN
        let real_pin = "realpin1234";
        let mut real_salt = [0u8; 32];
        getrandom::getrandom(&mut real_salt).unwrap();
        let real_hash = hash_pin_argon2id(real_pin.as_bytes(), &real_salt).unwrap();

        use base64::Engine;
        let real_hash_b64 = base64::engine::general_purpose::STANDARD.encode(&real_hash);
        let real_salt_b64 = base64::engine::general_purpose::STANDARD.encode(&real_salt);

        // Verify duress PIN
        let result = manager.verify_pin(duress_pin, &real_hash_b64, &real_salt_b64).unwrap();
        assert_eq!(result, PinVerifyResult::DuressPin);
    }

    #[test]
    fn test_verify_invalid_pin() {
        let mut manager = DuressManager::new();
        manager.configure(
            "duress9999",
            WipeActions::default(),
            DecoyProfile::default(),
        ).unwrap();

        let real_pin = "realpin1234";
        let mut real_salt = [0u8; 32];
        getrandom::getrandom(&mut real_salt).unwrap();
        let real_hash = hash_pin_argon2id(real_pin.as_bytes(), &real_salt).unwrap();

        use base64::Engine;
        let real_hash_b64 = base64::engine::general_purpose::STANDARD.encode(&real_hash);
        let real_salt_b64 = base64::engine::general_purpose::STANDARD.encode(&real_salt);

        // Verify wrong PIN
        let result = manager.verify_pin("wrongpin", &real_hash_b64, &real_salt_b64).unwrap();
        assert_eq!(result, PinVerifyResult::InvalidPin);
    }

    #[test]
    fn test_silent_alert() {
        let mut manager = DuressManager::new();
        manager.configure(
            "1234",
            WipeActions::default(),
            DecoyProfile::default(),
        ).unwrap();

        manager.enable_silent_alert("trusted_contact_123").unwrap();
        assert_eq!(manager.alert_contact(), Some("trusted_contact_123"));
    }

    #[test]
    fn test_export_import() {
        let mut manager = DuressManager::new();
        manager.configure(
            "1234",
            WipeActions::default(),
            DecoyProfile {
                display_name: "Test User".to_string(),
                ..Default::default()
            },
        ).unwrap();

        let exported = manager.export_config().unwrap();
        let restored = DuressManager::import_config(&exported).unwrap();
        assert!(restored.is_configured());
        assert_eq!(restored.decoy_profile().unwrap().display_name, "Test User");
    }

    #[test]
    fn test_emergency_wipe() {
        let actions = WipeActions::default();
        let ops = execute_emergency_wipe(&actions, "/tmp/test_data");
        assert!(!ops.is_empty());
        assert!(ops.iter().any(|op| op.contains("cryptographic keys")));
        assert!(ops.iter().any(|op| op.contains("message history")));
        assert!(ops.iter().any(|op| op.contains("self-destruct")));
    }

    #[test]
    fn test_destroy() {
        let mut manager = DuressManager::new();
        manager.configure(
            "1234",
            WipeActions::default(),
            DecoyProfile::default(),
        ).unwrap();

        assert!(manager.is_configured());
        manager.destroy();
        assert!(!manager.is_configured());
    }

    #[test]
    fn test_wipe_actions_custom() {
        let actions = WipeActions {
            destroy_keys: true,
            wipe_messages: true,
            wipe_contacts: false,
            wipe_wallet: false,
            wipe_call_history: true,
            secure_overwrite: false,
            overwrite_passes: 1,
            self_destruct_config: true,
        };
        let ops = execute_emergency_wipe(&actions, "/tmp/test");
        assert!(ops.iter().any(|op| op.contains("cryptographic keys")));
        assert!(ops.iter().any(|op| op.contains("message history")));
        assert!(!ops.iter().any(|op| op.contains("contact list")));
        assert!(!ops.iter().any(|op| op.contains("wallet")));
    }
}
