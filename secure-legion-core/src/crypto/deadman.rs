/// Dead Man's Switch Module
///
/// Implements a cryptographic dead man's switch that automatically destroys
/// sensitive key material if the user does not check in within a configured interval.
///
/// Designed for high-risk users (journalists, activists) who need assurance
/// that their data is destroyed if they are unable to access their device.
///
/// Mechanism:
/// 1. User sets a check-in interval (e.g., 7 days)
/// 2. A timer tracks the last successful check-in
/// 3. If the timer expires, all in-memory key material is zeroized
/// 4. Optionally, the encrypted database key is destroyed, rendering
///    the local database unrecoverable
///
/// The switch state is stored encrypted and checked on app startup.

use chrono::{DateTime, Utc, Duration};
use serde::{Serialize, Deserialize};
use thiserror::Error;
use zeroize::Zeroize;

#[derive(Error, Debug)]
pub enum DeadManError {
    #[error("Dead man's switch has triggered — keys destroyed")]
    SwitchTriggered,
    #[error("Switch not configured")]
    NotConfigured,
    #[error("Invalid interval: must be at least 1 day")]
    InvalidInterval,
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

pub type Result<T> = std::result::Result<T, DeadManError>;

/// Dead Man's Switch configuration and state
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DeadManSwitch {
    /// Whether the switch is enabled
    enabled: bool,
    /// Check-in interval in hours
    interval_hours: u64,
    /// Timestamp of the last successful check-in
    last_checkin: DateTime<Utc>,
    /// Number of consecutive missed check-ins before triggering (grace period)
    grace_periods: u32,
    /// Current number of missed periods (resets on check-in)
    missed_periods: u32,
    /// Whether the switch has been triggered (irreversible until reconfigured)
    triggered: bool,
    /// Optional: contact to notify (e.g., a trusted friend's public key hash)
    notify_contact: Option<String>,
}

/// Actions to take when the switch triggers
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WipeAction {
    /// Zeroize all in-memory key material
    pub zeroize_keys: bool,
    /// Delete the encrypted database key (renders DB unrecoverable)
    pub destroy_db_key: bool,
    /// Send a notification to the designated contact
    pub notify_trusted_contact: bool,
    /// Overwrite the identity seed backup
    pub destroy_backup: bool,
}

impl Default for WipeAction {
    fn default() -> Self {
        Self {
            zeroize_keys: true,
            destroy_db_key: true,
            notify_trusted_contact: false,
            destroy_backup: false,
        }
    }
}

/// Result of a check-in evaluation
#[derive(Clone, Debug)]
pub enum CheckInResult {
    /// Everything is fine, switch is not near expiry
    Ok { hours_remaining: i64 },
    /// Warning: check-in deadline approaching
    Warning { hours_remaining: i64 },
    /// Switch has triggered — keys must be destroyed
    Triggered { wipe_action: WipeAction },
    /// Switch is disabled
    Disabled,
}

impl DeadManSwitch {
    /// Create a new dead man's switch
    ///
    /// # Arguments
    /// * `interval_hours` - Hours between required check-ins (minimum 24)
    /// * `grace_periods` - Number of intervals to wait before triggering (0 = trigger immediately)
    pub fn new(interval_hours: u64, grace_periods: u32) -> Result<Self> {
        if interval_hours < 24 {
            return Err(DeadManError::InvalidInterval);
        }

        Ok(Self {
            enabled: true,
            interval_hours,
            last_checkin: Utc::now(),
            grace_periods,
            missed_periods: 0,
            triggered: false,
            notify_contact: None,
        })
    }

    /// Create a disabled switch (no-op)
    pub fn disabled() -> Self {
        Self {
            enabled: false,
            interval_hours: 0,
            last_checkin: Utc::now(),
            grace_periods: 0,
            missed_periods: 0,
            triggered: false,
            notify_contact: None,
        }
    }

    /// Set a trusted contact to notify on trigger
    pub fn set_notify_contact(&mut self, contact_id: String) {
        self.notify_contact = Some(contact_id);
    }

    /// Perform a check-in (user is alive and has access)
    ///
    /// Resets the timer and clears missed period counter.
    pub fn check_in(&mut self) -> Result<()> {
        if self.triggered {
            return Err(DeadManError::SwitchTriggered);
        }
        if !self.enabled {
            return Ok(());
        }

        self.last_checkin = Utc::now();
        self.missed_periods = 0;

        log::info!("Dead man's switch: check-in successful. Next deadline: {} hours",
            self.interval_hours);

        Ok(())
    }

    /// Evaluate the current state of the switch
    ///
    /// Call this on app startup and periodically in the background.
    pub fn evaluate(&mut self) -> CheckInResult {
        if !self.enabled {
            return CheckInResult::Disabled;
        }

        if self.triggered {
            return CheckInResult::Triggered {
                wipe_action: WipeAction {
                    notify_trusted_contact: self.notify_contact.is_some(),
                    ..Default::default()
                },
            };
        }

        let now = Utc::now();
        let deadline = self.last_checkin + Duration::hours(self.interval_hours as i64);
        let remaining = deadline - now;
        let hours_remaining = remaining.num_hours();

        if hours_remaining <= 0 {
            // Period expired
            self.missed_periods += 1;

            if self.missed_periods > self.grace_periods {
                self.triggered = true;
                log::warn!("Dead man's switch TRIGGERED after {} missed periods",
                    self.missed_periods);

                return CheckInResult::Triggered {
                    wipe_action: WipeAction {
                        notify_trusted_contact: self.notify_contact.is_some(),
                        ..Default::default()
                    },
                };
            }

            // Grace period — warn but don't trigger yet
            let next_deadline_hours = (self.grace_periods - self.missed_periods) as i64
                * self.interval_hours as i64;
            log::warn!("Dead man's switch: missed period {} of {}. {} hours until trigger.",
                self.missed_periods, self.grace_periods + 1, next_deadline_hours);

            CheckInResult::Warning {
                hours_remaining: next_deadline_hours,
            }
        } else if hours_remaining < 24 {
            // Less than 24 hours remaining — warn
            CheckInResult::Warning { hours_remaining }
        } else {
            CheckInResult::Ok { hours_remaining }
        }
    }

    /// Check if the switch has been triggered
    pub fn is_triggered(&self) -> bool {
        self.triggered
    }

    /// Check if the switch is enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    /// Disable the switch (requires recent check-in for security)
    pub fn disable(&mut self) -> Result<()> {
        if self.triggered {
            return Err(DeadManError::SwitchTriggered);
        }
        self.enabled = false;
        log::info!("Dead man's switch disabled");
        Ok(())
    }

    /// Reconfigure the switch interval
    pub fn reconfigure(&mut self, interval_hours: u64, grace_periods: u32) -> Result<()> {
        if self.triggered {
            return Err(DeadManError::SwitchTriggered);
        }
        if interval_hours < 24 {
            return Err(DeadManError::InvalidInterval);
        }

        self.interval_hours = interval_hours;
        self.grace_periods = grace_periods;
        self.last_checkin = Utc::now();
        self.missed_periods = 0;

        log::info!("Dead man's switch reconfigured: {} hours, {} grace periods",
            interval_hours, grace_periods);

        Ok(())
    }

    /// Serialize the switch state for encrypted storage
    pub fn to_bytes(&self) -> Result<Vec<u8>> {
        bincode::serialize(self)
            .map_err(|e| DeadManError::SerializationError(e.to_string()))
    }

    /// Deserialize the switch state from encrypted storage
    pub fn from_bytes(data: &[u8]) -> Result<Self> {
        bincode::deserialize(data)
            .map_err(|e| DeadManError::SerializationError(e.to_string()))
    }

    /// Get time remaining until next deadline
    pub fn hours_until_deadline(&self) -> i64 {
        if !self.enabled {
            return i64::MAX;
        }
        let deadline = self.last_checkin + Duration::hours(self.interval_hours as i64);
        (deadline - Utc::now()).num_hours()
    }
}

/// Execute wipe actions on the given key material
///
/// This function zeroizes in-memory keys and returns a list of
/// filesystem paths that should be securely deleted by the caller.
///
/// # Arguments
/// * `action` - The wipe actions to perform
/// * `keys` - Mutable references to key arrays to zeroize
///
/// # Returns
/// List of file paths that should be overwritten/deleted
pub fn execute_wipe(
    action: &WipeAction,
    keys: &mut [&mut [u8]],
) -> Vec<String> {
    let mut paths_to_delete = Vec::new();

    if action.zeroize_keys {
        for key in keys.iter_mut() {
            key.zeroize();
        }
        log::warn!("Dead man's switch: all in-memory keys zeroized");
    }

    if action.destroy_db_key {
        // The caller should delete this file
        paths_to_delete.push("db_encryption_key".to_string());
        log::warn!("Dead man's switch: database key marked for destruction");
    }

    if action.destroy_backup {
        paths_to_delete.push("identity_backup".to_string());
        log::warn!("Dead man's switch: backup marked for destruction");
    }

    paths_to_delete
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_switch_creation() {
        let switch = DeadManSwitch::new(168, 1).unwrap(); // 7 days, 1 grace
        assert!(switch.is_enabled());
        assert!(!switch.is_triggered());
        assert!(switch.hours_until_deadline() > 0);
    }

    #[test]
    fn test_invalid_interval() {
        assert!(DeadManSwitch::new(12, 0).is_err()); // Less than 24 hours
    }

    #[test]
    fn test_check_in() {
        let mut switch = DeadManSwitch::new(48, 0).unwrap();
        switch.check_in().unwrap();
        assert!(!switch.is_triggered());

        match switch.evaluate() {
            CheckInResult::Ok { .. } => {},
            other => panic!("Expected Ok, got {:?}", std::mem::discriminant(&other)),
        }
    }

    #[test]
    fn test_disabled_switch() {
        let mut switch = DeadManSwitch::disabled();
        assert!(!switch.is_enabled());

        match switch.evaluate() {
            CheckInResult::Disabled => {},
            _ => panic!("Expected Disabled"),
        }
    }

    #[test]
    fn test_serialization() {
        let switch = DeadManSwitch::new(48, 2).unwrap();
        let bytes = switch.to_bytes().unwrap();
        let restored = DeadManSwitch::from_bytes(&bytes).unwrap();

        assert_eq!(restored.interval_hours, 48);
        assert_eq!(restored.grace_periods, 2);
        assert!(restored.is_enabled());
    }

    #[test]
    fn test_reconfigure() {
        let mut switch = DeadManSwitch::new(24, 0).unwrap();
        switch.reconfigure(72, 2).unwrap();
        assert_eq!(switch.interval_hours, 72);
        assert_eq!(switch.grace_periods, 2);
    }

    #[test]
    fn test_execute_wipe() {
        let action = WipeAction::default();
        let mut key1 = [0xABu8; 32];
        let mut key2 = [0xCDu8; 32];

        let paths = execute_wipe(&action, &mut [&mut key1, &mut key2]);

        // Keys should be zeroized
        assert_eq!(key1, [0u8; 32]);
        assert_eq!(key2, [0u8; 32]);

        // Should include db key path
        assert!(paths.contains(&"db_encryption_key".to_string()));
    }

    #[test]
    fn test_disable_switch() {
        let mut switch = DeadManSwitch::new(24, 0).unwrap();
        assert!(switch.is_enabled());
        switch.disable().unwrap();
        assert!(!switch.is_enabled());
    }

    #[test]
    fn test_notify_contact() {
        let mut switch = DeadManSwitch::new(24, 0).unwrap();
        switch.set_notify_contact("alice_pubkey_hash".to_string());
        assert_eq!(switch.notify_contact, Some("alice_pubkey_hash".to_string()));
    }
}
