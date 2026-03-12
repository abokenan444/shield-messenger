//! Crisis Mode Controller — Emergency operational mode for high-threat environments.
//!
//! Activates redundant multi-transport delivery, fixed-size padding,
//! dummy traffic generation, shortened auto-destruct timers,
//! and per-message identity rotation.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::SystemTime;

use log::info;
use rand::RngCore;
use serde::{Deserialize, Serialize};

use super::switcher::ThreatLevel;
use super::transport::{Envelope, MessagePriority};

/// Fixed envelope size in crisis mode (2048 bytes) to prevent traffic analysis.
const CRISIS_ENVELOPE_SIZE: usize = 2048;
/// Dummy traffic interval in crisis mode (milliseconds).
const DUMMY_TRAFFIC_INTERVAL_MS: u64 = 5_000;
/// Auto-destruct timer in crisis mode (seconds).
const CRISIS_AUTO_DESTRUCT_SECS: u64 = 30;
/// Normal auto-destruct timer (seconds).
const NORMAL_AUTO_DESTRUCT_SECS: u64 = 300;

/// Crisis activation trigger.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CrisisTrigger {
    /// User manually activated crisis mode.
    Manual,
    /// Multiple connection failures detected.
    ConnectionFailures { count: u32 },
    /// Tor circuit broken repeatedly.
    TorCircuitInstability { failures: u32 },
    /// Network tampering detected (MITM, DNS poisoning).
    NetworkTampering,
    /// Unusual traffic analysis detected (timing correlation).
    TrafficAnalysis,
    /// GPS/location indicates high-risk area.
    LocationRisk { region: String },
    /// Peer reported threat.
    PeerAlert { peer_id: String },
}

/// Crisis mode configuration.
#[derive(Clone)]
pub struct CrisisConfig {
    /// Use redundant delivery across all available transports.
    pub redundant_delivery: bool,
    /// Pad all envelopes to fixed size.
    pub fixed_size_padding: bool,
    /// Generate dummy traffic.
    pub dummy_traffic: bool,
    /// Rotate identity per message.
    pub per_message_rotation: bool,
    /// Shortened auto-destruct timer.
    pub auto_destruct_secs: u64,
    /// Interval for dummy traffic (ms).
    pub dummy_interval_ms: u64,
    /// Maximum allowed transports for redundancy.
    pub max_redundant_transports: usize,
}

impl Default for CrisisConfig {
    fn default() -> Self {
        Self {
            redundant_delivery: true,
            fixed_size_padding: true,
            dummy_traffic: true,
            per_message_rotation: true,
            auto_destruct_secs: CRISIS_AUTO_DESTRUCT_SECS,
            dummy_interval_ms: DUMMY_TRAFFIC_INTERVAL_MS,
            max_redundant_transports: 3,
        }
    }
}

/// The Crisis Mode Controller.
pub struct CrisisController {
    /// Whether crisis mode is active.
    active: AtomicBool,
    /// When crisis mode was activated (Unix millis, 0 if inactive).
    activated_at: AtomicU64,
    /// Current threat level.
    threat_level: Mutex<ThreatLevel>,
    /// Crisis configuration.
    config: Mutex<CrisisConfig>,
    /// Active triggers.
    triggers: Mutex<Vec<CrisisTrigger>>,
    /// Connection failure counter.
    connection_failures: AtomicU64,
    /// Tor circuit failure counter.
    tor_failures: AtomicU64,
    /// Threshold for auto-activation on connection failures.
    failure_threshold: u32,
    /// Threshold for Tor circuit instability.
    tor_failure_threshold: u32,
}

impl CrisisController {
    pub fn new() -> Self {
        Self {
            active: AtomicBool::new(false),
            activated_at: AtomicU64::new(0),
            threat_level: Mutex::new(ThreatLevel::Normal),
            config: Mutex::new(CrisisConfig::default()),
            triggers: Mutex::new(Vec::new()),
            connection_failures: AtomicU64::new(0),
            tor_failures: AtomicU64::new(0),
            failure_threshold: 5,
            tor_failure_threshold: 3,
        }
    }

    /// Check if crisis mode is currently active.
    pub fn is_active(&self) -> bool {
        self.active.load(Ordering::Relaxed)
    }

    /// Get the current threat level.
    pub fn threat_level(&self) -> ThreatLevel {
        self.threat_level.lock().unwrap().clone()
    }

    /// Get crisis configuration.
    pub fn config(&self) -> CrisisConfig {
        self.config.lock().unwrap().clone()
    }

    /// Manually activate crisis mode.
    pub fn activate(&self, trigger: CrisisTrigger) {
        self.active.store(true, Ordering::SeqCst);
        self.activated_at.store(now_millis(), Ordering::SeqCst);

        if let Ok(mut tl) = self.threat_level.lock() {
            *tl = ThreatLevel::Critical;
        }

        if let Ok(mut triggers) = self.triggers.lock() {
            if !triggers.contains(&trigger) {
                triggers.push(trigger.clone());
            }
        }

        info!("[AetherNet/Crisis] CRISIS MODE ACTIVATED: {:?}", trigger);
    }

    /// Deactivate crisis mode.
    pub fn deactivate(&self) {
        self.active.store(false, Ordering::SeqCst);
        self.activated_at.store(0, Ordering::SeqCst);
        self.connection_failures.store(0, Ordering::SeqCst);
        self.tor_failures.store(0, Ordering::SeqCst);

        if let Ok(mut tl) = self.threat_level.lock() {
            *tl = ThreatLevel::Normal;
        }

        if let Ok(mut triggers) = self.triggers.lock() {
            triggers.clear();
        }

        info!("[AetherNet/Crisis] Crisis mode deactivated");
    }

    /// Report a connection failure (may trigger automatic crisis activation).
    pub fn report_connection_failure(&self) {
        let count = self.connection_failures.fetch_add(1, Ordering::SeqCst) + 1;
        if count >= self.failure_threshold as u64 && !self.is_active() {
            self.activate(CrisisTrigger::ConnectionFailures {
                count: count as u32,
            });
        } else if count >= (self.failure_threshold / 2) as u64 {
            // Elevate threat
            if let Ok(mut tl) = self.threat_level.lock() {
                if *tl == ThreatLevel::Normal {
                    *tl = ThreatLevel::Elevated;
                    info!("[AetherNet/Crisis] Threat level elevated (connection failures: {})", count);
                }
            }
        }
    }

    /// Report a Tor circuit failure.
    pub fn report_tor_failure(&self) {
        let count = self.tor_failures.fetch_add(1, Ordering::SeqCst) + 1;
        if count >= self.tor_failure_threshold as u64 && !self.is_active() {
            self.activate(CrisisTrigger::TorCircuitInstability {
                failures: count as u32,
            });
        }
    }

    /// Report network tampering detection.
    pub fn report_tampering(&self) {
        self.activate(CrisisTrigger::NetworkTampering);
    }

    /// Report traffic analysis detection.
    pub fn report_traffic_analysis(&self) {
        self.activate(CrisisTrigger::TrafficAnalysis);
    }

    /// Reset failure counters (called on successful operations).
    pub fn report_success(&self) {
        self.connection_failures.store(0, Ordering::SeqCst);
        // Don't reset tor_failures — those need explicit reset
    }

    /// Pad an envelope to fixed size for traffic analysis resistance.
    pub fn pad_envelope(&self, mut data: Vec<u8>) -> Vec<u8> {
        if !self.is_active() {
            return data;
        }

        let config = self.config();
        if !config.fixed_size_padding {
            return data;
        }

        if data.len() < CRISIS_ENVELOPE_SIZE {
            // Pad with random bytes
            let pad_len = CRISIS_ENVELOPE_SIZE - data.len();
            let mut padding = vec![0u8; pad_len];
            rand::thread_rng().fill_bytes(&mut padding);
            // Prepend original length as 4-byte LE
            let orig_len = data.len() as u32;
            let mut padded = Vec::with_capacity(4 + CRISIS_ENVELOPE_SIZE);
            padded.extend_from_slice(&orig_len.to_le_bytes());
            padded.append(&mut data);
            padded.extend_from_slice(&padding);
            padded
        } else {
            // Already larger — prepend length header
            let orig_len = data.len() as u32;
            let mut result = Vec::with_capacity(4 + data.len());
            result.extend_from_slice(&orig_len.to_le_bytes());
            result.append(&mut data);
            result
        }
    }

    /// Remove padding from a received envelope.
    pub fn unpad_envelope(data: &[u8]) -> Option<Vec<u8>> {
        if data.len() < 4 {
            return None;
        }
        let orig_len = u32::from_le_bytes([data[0], data[1], data[2], data[3]]) as usize;
        if orig_len + 4 > data.len() {
            return None;
        }
        Some(data[4..4 + orig_len].to_vec())
    }

    /// Generate a dummy envelope (for traffic analysis resistance).
    pub fn generate_dummy_envelope(&self) -> Envelope {
        let mut rng = rand::thread_rng();
        let mut id = [0u8; 16];
        rng.fill_bytes(&mut id);
        let mut ciphertext = vec![0u8; CRISIS_ENVELOPE_SIZE];
        rng.fill_bytes(&mut ciphertext);

        Envelope {
            id: hex::encode(&id),
            sender_pubkey: [0u8; 32], // Dummy
            recipient_pubkey: [0u8; 32],
            ciphertext,
            priority: MessagePriority::Bulk,
            timestamp: now_secs(),
            ttl: 60, // Short TTL
            hop_count: 0,
            max_hops: 1,
            signature: [0u8; 64],
        }
    }

    /// Get the auto-destruct timer (seconds) based on current mode.
    pub fn auto_destruct_secs(&self) -> u64 {
        if self.is_active() {
            self.config().auto_destruct_secs
        } else {
            NORMAL_AUTO_DESTRUCT_SECS
        }
    }

    /// Get the message priority override in crisis mode.
    /// All messages become at least Urgent.
    pub fn override_priority(&self, original: MessagePriority) -> MessagePriority {
        if !self.is_active() {
            return original;
        }
        match original {
            MessagePriority::Bulk | MessagePriority::Normal => MessagePriority::Urgent,
            other => other,
        }
    }

    /// How long crisis mode has been active (ms), or 0.
    pub fn active_duration_ms(&self) -> u64 {
        let activated = self.activated_at.load(Ordering::Relaxed);
        if activated == 0 {
            return 0;
        }
        now_millis().saturating_sub(activated)
    }

    /// Get active triggers.
    pub fn active_triggers(&self) -> Vec<CrisisTrigger> {
        self.triggers.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crisis_manual_activation() {
        let ctrl = CrisisController::new();
        assert!(!ctrl.is_active());
        assert_eq!(ctrl.threat_level(), ThreatLevel::Normal);

        ctrl.activate(CrisisTrigger::Manual);
        assert!(ctrl.is_active());
        assert_eq!(ctrl.threat_level(), ThreatLevel::Critical);

        ctrl.deactivate();
        assert!(!ctrl.is_active());
        assert_eq!(ctrl.threat_level(), ThreatLevel::Normal);
    }

    #[test]
    fn test_crisis_auto_activation() {
        let ctrl = CrisisController::new();
        for _ in 0..4 {
            ctrl.report_connection_failure();
        }
        assert!(!ctrl.is_active()); // Below threshold

        ctrl.report_connection_failure(); // 5th = threshold
        assert!(ctrl.is_active());
    }

    #[test]
    fn test_padding() {
        let ctrl = CrisisController::new();
        ctrl.activate(CrisisTrigger::Manual);

        let data = vec![1, 2, 3, 4, 5];
        let padded = ctrl.pad_envelope(data.clone());
        assert!(padded.len() >= CRISIS_ENVELOPE_SIZE);

        let unpadded = CrisisController::unpad_envelope(&padded).unwrap();
        assert_eq!(unpadded, data);
    }

    #[test]
    fn test_priority_override() {
        let ctrl = CrisisController::new();
        assert_eq!(
            ctrl.override_priority(MessagePriority::Bulk),
            MessagePriority::Bulk
        ); // Not active

        ctrl.activate(CrisisTrigger::Manual);
        assert_eq!(
            ctrl.override_priority(MessagePriority::Bulk),
            MessagePriority::Urgent
        );
        assert_eq!(
            ctrl.override_priority(MessagePriority::Critical),
            MessagePriority::Critical
        );
    }
}
