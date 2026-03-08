//! Tor Sleep Mode Manager
//!
//! Implements smart sleep/wake cycle for mobile Tor onion services.
//! Allows the device to enter deep sleep while maintaining the ability
//! to receive messages through periodic wake-ups and circuit maintenance.
//!
//! Architecture:
//! - Sleep Mode: Reduce timer sensitivity, batch events, minimal network activity
//! - Wake Mode: Full Tor operation with all circuits and listeners active
//! - Maintenance Wake: Brief wake period for circuit refresh and descriptor updates
//!
//! References:
//! - Tor-dev mailing list discussions on mobile Tor power optimization
//! - Briar's approach: Java alarms every 15 minutes (Michael Rogers)
//! - USENIX paper on Tor power consumption on mobile devices

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::time::{Duration, Instant};

/// Sleep mode state
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SleepState {
    /// Fully awake - all Tor operations at full speed
    Awake,
    /// Transitioning to sleep - flushing pending operations
    EnteringSleep,
    /// Deep sleep - minimal activity, periodic maintenance only
    Sleeping,
    /// Maintenance wake - brief wake for circuit refresh
    MaintenanceWake,
    /// Waking up from sleep - rebuilding circuits if needed
    WakingUp,
}

/// Configuration for sleep mode behavior
#[derive(Debug, Clone)]
pub struct SleepConfig {
    /// Interval between maintenance wakes (default: 15 minutes)
    pub maintenance_interval: Duration,
    /// Duration of each maintenance wake (default: 60 seconds)
    pub maintenance_duration: Duration,
    /// Time to wait before entering sleep after last activity (default: 5 minutes)
    pub idle_timeout: Duration,
    /// Whether to send cover traffic during sleep (anti-traffic-analysis)
    pub cover_traffic_enabled: bool,
    /// Interval for cover traffic packets during sleep
    pub cover_traffic_interval: Duration,
    /// Maximum time circuits can be idle before needing refresh
    pub circuit_max_idle: Duration,
    /// Whether to reduce timer precision during sleep
    pub reduce_timer_precision: bool,
}

impl Default for SleepConfig {
    fn default() -> Self {
        Self {
            maintenance_interval: Duration::from_secs(15 * 60), // 15 minutes
            maintenance_duration: Duration::from_secs(60),      // 1 minute
            idle_timeout: Duration::from_secs(5 * 60),          // 5 minutes
            cover_traffic_enabled: true,
            cover_traffic_interval: Duration::from_secs(30), // Every 30 seconds
            circuit_max_idle: Duration::from_secs(10 * 60),  // 10 minutes
            reduce_timer_precision: true,
        }
    }
}

/// Sleep mode manager - tracks state and timing
pub struct SleepModeManager {
    /// Current sleep state
    state: SleepState,
    /// Configuration
    config: SleepConfig,
    /// When the current state was entered
    state_entered_at: Instant,
    /// Last time any network activity occurred
    last_activity: Instant,
    /// Last maintenance wake timestamp
    last_maintenance: Instant,
    /// Number of maintenance wakes performed
    maintenance_count: u64,
    /// Whether sleep mode is globally enabled
    enabled: AtomicBool,
    /// Total time spent sleeping (microseconds)
    total_sleep_us: AtomicU64,
    /// Number of messages received during sleep (woke up for)
    messages_during_sleep: AtomicU64,
}

impl SleepModeManager {
    pub fn new(config: SleepConfig) -> Self {
        let now = Instant::now();
        Self {
            state: SleepState::Awake,
            config,
            state_entered_at: now,
            last_activity: now,
            last_maintenance: now,
            maintenance_count: 0,
            enabled: AtomicBool::new(false),
            total_sleep_us: AtomicU64::new(0),
            messages_during_sleep: AtomicU64::new(0),
        }
    }

    /// Enable or disable sleep mode
    pub fn set_enabled(&self, enabled: bool) {
        self.enabled.store(enabled, Ordering::SeqCst);
    }

    /// Check if sleep mode is enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled.load(Ordering::SeqCst)
    }

    /// Get current sleep state
    pub fn get_state(&self) -> SleepState {
        self.state
    }

    /// Record network activity (resets idle timer)
    pub fn record_activity(&mut self) {
        self.last_activity = Instant::now();
        // If we were sleeping and got activity, transition to waking
        if self.state == SleepState::Sleeping {
            self.messages_during_sleep.fetch_add(1, Ordering::Relaxed);
            self.transition_to(SleepState::WakingUp);
        }
    }

    /// Check if it's time for a maintenance wake
    pub fn needs_maintenance(&self) -> bool {
        if self.state != SleepState::Sleeping {
            return false;
        }
        self.last_maintenance.elapsed() >= self.config.maintenance_interval
    }

    /// Check if the device should enter sleep (idle timeout exceeded)
    pub fn should_sleep(&self) -> bool {
        if !self.is_enabled() || self.state != SleepState::Awake {
            return false;
        }
        self.last_activity.elapsed() >= self.config.idle_timeout
    }

    /// Check if maintenance wake is complete
    pub fn maintenance_complete(&self) -> bool {
        if self.state != SleepState::MaintenanceWake {
            return false;
        }
        self.state_entered_at.elapsed() >= self.config.maintenance_duration
    }

    /// Transition to a new state
    pub fn transition_to(&mut self, new_state: SleepState) {
        let now = Instant::now();

        // Track sleep time
        if self.state == SleepState::Sleeping {
            let sleep_duration = self.state_entered_at.elapsed();
            self.total_sleep_us
                .fetch_add(sleep_duration.as_micros() as u64, Ordering::Relaxed);
        }

        // Update maintenance timestamp
        if new_state == SleepState::MaintenanceWake {
            self.last_maintenance = now;
            self.maintenance_count += 1;
        }

        log::info!(
            "SleepMode: {:?} -> {:?} (after {:?})",
            self.state,
            new_state,
            self.state_entered_at.elapsed()
        );

        self.state = new_state;
        self.state_entered_at = now;
    }

    /// Enter sleep mode
    pub fn enter_sleep(&mut self) {
        if self.state == SleepState::Awake {
            self.transition_to(SleepState::EnteringSleep);
        }
    }

    /// Start maintenance wake
    pub fn start_maintenance(&mut self) {
        if self.state == SleepState::Sleeping {
            self.transition_to(SleepState::MaintenanceWake);
        }
    }

    /// Complete entering sleep (after flushing pending ops)
    pub fn complete_sleep_entry(&mut self) {
        if self.state == SleepState::EnteringSleep {
            self.transition_to(SleepState::Sleeping);
        }
    }

    /// Complete waking up
    pub fn complete_wake(&mut self) {
        if self.state == SleepState::WakingUp || self.state == SleepState::MaintenanceWake {
            self.transition_to(SleepState::Awake);
            self.last_activity = Instant::now();
        }
    }

    /// Return to sleep after maintenance
    pub fn end_maintenance(&mut self) {
        if self.state == SleepState::MaintenanceWake {
            self.transition_to(SleepState::Sleeping);
        }
    }

    /// Force full wake (e.g., user opened app)
    pub fn force_wake(&mut self) {
        self.transition_to(SleepState::Awake);
        self.last_activity = Instant::now();
    }

    /// Get statistics
    pub fn get_stats(&self) -> SleepStats {
        SleepStats {
            current_state: self.state,
            maintenance_count: self.maintenance_count,
            total_sleep_secs: self.total_sleep_us.load(Ordering::Relaxed) / 1_000_000,
            messages_during_sleep: self.messages_during_sleep.load(Ordering::Relaxed),
            time_in_current_state: self.state_entered_at.elapsed(),
        }
    }

    /// Whether cover traffic should be sent right now
    pub fn should_send_cover_traffic(&self) -> bool {
        if !self.config.cover_traffic_enabled {
            return false;
        }
        // Send cover traffic in all states to maintain consistent traffic pattern
        matches!(
            self.state,
            SleepState::Sleeping | SleepState::Awake | SleepState::MaintenanceWake
        )
    }
}

/// Sleep mode statistics
#[derive(Debug)]
pub struct SleepStats {
    pub current_state: SleepState,
    pub maintenance_count: u64,
    pub total_sleep_secs: u64,
    pub messages_during_sleep: u64,
    pub time_in_current_state: Duration,
}

/// Global sleep mode state (thread-safe atomic flags for JNI access)
static GLOBAL_SLEEP_ENABLED: AtomicBool = AtomicBool::new(false);
static GLOBAL_SLEEP_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Set global sleep mode enabled state (called from JNI)
pub fn set_sleep_mode_enabled(enabled: bool) {
    GLOBAL_SLEEP_ENABLED.store(enabled, Ordering::SeqCst);
    log::info!(
        "SleepMode globally {}",
        if enabled { "enabled" } else { "disabled" }
    );
}

/// Check if sleep mode is globally enabled
pub fn is_sleep_mode_enabled() -> bool {
    GLOBAL_SLEEP_ENABLED.load(Ordering::SeqCst)
}

/// Set whether device is currently in sleep state
pub fn set_sleep_active(active: bool) {
    GLOBAL_SLEEP_ACTIVE.store(active, Ordering::SeqCst);
    log::info!("SleepMode active: {}", active);
}

/// Check if device is currently sleeping
pub fn is_sleep_active() -> bool {
    GLOBAL_SLEEP_ACTIVE.load(Ordering::SeqCst)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sleep_mode_lifecycle() {
        let config = SleepConfig {
            idle_timeout: Duration::from_millis(10),
            maintenance_interval: Duration::from_millis(50),
            maintenance_duration: Duration::from_millis(20),
            ..Default::default()
        };

        let mut mgr = SleepModeManager::new(config);
        mgr.set_enabled(true);

        assert_eq!(mgr.get_state(), SleepState::Awake);

        // Simulate idle
        std::thread::sleep(Duration::from_millis(15));
        assert!(mgr.should_sleep());

        // Enter sleep
        mgr.enter_sleep();
        assert_eq!(mgr.get_state(), SleepState::EnteringSleep);

        mgr.complete_sleep_entry();
        assert_eq!(mgr.get_state(), SleepState::Sleeping);

        // Simulate activity during sleep
        mgr.record_activity();
        assert_eq!(mgr.get_state(), SleepState::WakingUp);

        mgr.complete_wake();
        assert_eq!(mgr.get_state(), SleepState::Awake);
    }

    #[test]
    fn test_force_wake() {
        let config = SleepConfig::default();
        let mut mgr = SleepModeManager::new(config);
        mgr.set_enabled(true);

        mgr.transition_to(SleepState::Sleeping);
        mgr.force_wake();
        assert_eq!(mgr.get_state(), SleepState::Awake);
    }
}
