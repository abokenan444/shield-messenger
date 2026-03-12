//! Trust Map — Local-only trust scoring for mesh peers.
//!
//! Maintains per-peer trust scores based on delivery reliability,
//! latency consistency, uptime, vouchers from other trusted peers,
//! and penalty events. Scores are NEVER shared over the network.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use log::{debug, info, warn};
use serde::{Deserialize, Serialize};

/// Minimum trust score (blacklisted).
const MIN_TRUST: f64 = 0.0;
/// Maximum trust score.
const MAX_TRUST: f64 = 1.0;
/// Default trust for new peers.
const DEFAULT_TRUST: f64 = 0.5;
/// Trust decay rate per day of inactivity.
const TRUST_DECAY_PER_DAY: f64 = 0.01;
/// Reward for successful relay.
const RELAY_SUCCESS_REWARD: f64 = 0.02;
/// Penalty for failed relay.
const RELAY_FAILURE_PENALTY: f64 = 0.05;
/// Penalty for suspicious behavior.
const SUSPICIOUS_PENALTY: f64 = 0.15;
/// Vouch bonus (from a trusted peer).
const VOUCH_BONUS: f64 = 0.05;
/// Maximum vouches that count.
const MAX_VOUCHES: usize = 5;
/// Blacklist threshold.
const BLACKLIST_THRESHOLD: f64 = 0.1;

/// Trust record for a single peer.
#[derive(Clone, Serialize, Deserialize)]
pub struct TrustRecord {
    /// Peer's public key.
    pub peer_pubkey: [u8; 32],
    /// Composite trust score [0.0, 1.0].
    pub score: f64,
    /// Successful relay count.
    pub relay_successes: u64,
    /// Failed relay count.
    pub relay_failures: u64,
    /// Average latency in milliseconds.
    pub avg_latency_ms: f64,
    /// Latency sample count (for running average).
    latency_samples: u64,
    /// Number of vouches from other trusted peers.
    pub vouch_count: u32,
    /// Vouching peers (public keys).
    pub vouchers: Vec<[u8; 32]>,
    /// Penalty events.
    pub penalties: Vec<PenaltyEvent>,
    /// First seen (Unix seconds).
    pub first_seen: u64,
    /// Last successful interaction (Unix seconds).
    pub last_seen: u64,
    /// Whether this peer is blacklisted.
    pub blacklisted: bool,
}

/// A penalty event.
#[derive(Clone, Serialize, Deserialize)]
pub struct PenaltyEvent {
    pub reason: PenaltyReason,
    pub timestamp: u64,
    pub score_impact: f64,
}

/// Reasons for trust penalties.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum PenaltyReason {
    /// Relay failed / dropped message.
    RelayFailure,
    /// Delivered tampered message (signature mismatch).
    TamperedMessage,
    /// Excessive latency (possible interception).
    ExcessiveLatency,
    /// Replay attack detected.
    ReplayAttack,
    /// Sybil attack suspicion (multiple identities from same source).
    SybilSuspicion,
    /// General suspicious behavior.
    Suspicious,
}

impl TrustRecord {
    fn new(peer_pubkey: [u8; 32]) -> Self {
        let now = now_secs();
        Self {
            peer_pubkey,
            score: DEFAULT_TRUST,
            relay_successes: 0,
            relay_failures: 0,
            avg_latency_ms: 0.0,
            latency_samples: 0,
            vouch_count: 0,
            vouchers: Vec::new(),
            penalties: Vec::new(),
            first_seen: now,
            last_seen: now,
            blacklisted: false,
        }
    }

    /// Compute the composite trust score from all factors.
    fn recompute_score(&mut self) {
        let total_relays = self.relay_successes + self.relay_failures;
        let reliability = if total_relays > 0 {
            self.relay_successes as f64 / total_relays as f64
        } else {
            DEFAULT_TRUST
        };

        // Latency factor: lower is better, cap at 5000ms
        let latency_factor = if self.avg_latency_ms > 0.0 {
            1.0 - (self.avg_latency_ms / 5000.0).min(1.0)
        } else {
            0.5
        };

        // Vouch factor: each vouch (capped) adds trust
        let vouch_factor = (self.vouch_count.min(MAX_VOUCHES as u32) as f64) * VOUCH_BONUS;

        // Penalty factor
        let recent_penalties = self
            .penalties
            .iter()
            .filter(|p| now_secs() - p.timestamp < 86400) // Last 24h
            .map(|p| p.score_impact)
            .sum::<f64>();

        // Age factor: longer-known peers get slight bonus
        let age_days = (now_secs() - self.first_seen) as f64 / 86400.0;
        let age_bonus = (age_days / 30.0).min(0.1); // Max 0.1 bonus after 30 days

        // Decay for inactivity
        let inactive_days = (now_secs() - self.last_seen) as f64 / 86400.0;
        let decay = inactive_days * TRUST_DECAY_PER_DAY;

        // Composite: weighted sum
        self.score = (reliability * 0.40
            + latency_factor * 0.15
            + vouch_factor
            + age_bonus
            + DEFAULT_TRUST * 0.10) // base
            - recent_penalties
            - decay;

        // Clamp
        self.score = self.score.clamp(MIN_TRUST, MAX_TRUST);

        // Auto-blacklist
        if self.score < BLACKLIST_THRESHOLD {
            self.blacklisted = true;
        }
    }
}

/// The Trust Map — local-only peer trust database.
pub struct TrustMap {
    records: Mutex<HashMap<[u8; 32], TrustRecord>>,
}

impl TrustMap {
    pub fn new() -> Self {
        Self {
            records: Mutex::new(HashMap::new()),
        }
    }

    /// Get trust score for a peer. Creates record if unknown.
    pub fn trust_score(&self, peer_pubkey: &[u8; 32]) -> f64 {
        let mut records = self.records.lock().unwrap();
        let record = records
            .entry(*peer_pubkey)
            .or_insert_with(|| TrustRecord::new(*peer_pubkey));
        record.recompute_score();
        record.score
    }

    /// Check if a peer is blacklisted.
    pub fn is_blacklisted(&self, peer_pubkey: &[u8; 32]) -> bool {
        self.records
            .lock()
            .ok()
            .and_then(|r| r.get(peer_pubkey).map(|t| t.blacklisted))
            .unwrap_or(false)
    }

    /// Record a successful relay by a peer.
    pub fn record_relay_success(&self, peer_pubkey: &[u8; 32], latency_ms: u64) {
        let mut records = self.records.lock().unwrap();
        let record = records
            .entry(*peer_pubkey)
            .or_insert_with(|| TrustRecord::new(*peer_pubkey));

        record.relay_successes += 1;
        record.last_seen = now_secs();

        // Running average latency
        record.latency_samples += 1;
        record.avg_latency_ms = record.avg_latency_ms
            + (latency_ms as f64 - record.avg_latency_ms) / record.latency_samples as f64;

        record.recompute_score();
        debug!(
            "[AetherNet/Trust] Peer {:?} relay success, trust={:.3}",
            &peer_pubkey[..4],
            record.score
        );
    }

    /// Record a failed relay by a peer.
    pub fn record_relay_failure(&self, peer_pubkey: &[u8; 32]) {
        let mut records = self.records.lock().unwrap();
        let record = records
            .entry(*peer_pubkey)
            .or_insert_with(|| TrustRecord::new(*peer_pubkey));

        record.relay_failures += 1;
        record.last_seen = now_secs();
        record.penalties.push(PenaltyEvent {
            reason: PenaltyReason::RelayFailure,
            timestamp: now_secs(),
            score_impact: RELAY_FAILURE_PENALTY,
        });

        record.recompute_score();
        warn!(
            "[AetherNet/Trust] Peer {:?} relay failure, trust={:.3}",
            &peer_pubkey[..4],
            record.score
        );
    }

    /// Report suspicious behavior.
    pub fn report_suspicious(&self, peer_pubkey: &[u8; 32], reason: PenaltyReason) {
        let mut records = self.records.lock().unwrap();
        let record = records
            .entry(*peer_pubkey)
            .or_insert_with(|| TrustRecord::new(*peer_pubkey));

        record.penalties.push(PenaltyEvent {
            reason,
            timestamp: now_secs(),
            score_impact: SUSPICIOUS_PENALTY,
        });

        record.recompute_score();
        warn!(
            "[AetherNet/Trust] Peer {:?} suspicious activity, trust={:.3}",
            &peer_pubkey[..4],
            record.score
        );
    }

    /// Add a vouch from a trusted peer.
    pub fn add_vouch(&self, peer_pubkey: &[u8; 32], voucher_pubkey: &[u8; 32]) {
        // Only accept vouches from peers we trust
        let voucher_trusted = self.trust_score(voucher_pubkey) >= 0.6;
        if !voucher_trusted {
            debug!("[AetherNet/Trust] Ignoring vouch from untrusted peer");
            return;
        }

        let mut records = self.records.lock().unwrap();
        let record = records
            .entry(*peer_pubkey)
            .or_insert_with(|| TrustRecord::new(*peer_pubkey));

        if !record.vouchers.contains(voucher_pubkey)
            && record.vouchers.len() < MAX_VOUCHES
        {
            record.vouchers.push(*voucher_pubkey);
            record.vouch_count += 1;
            record.recompute_score();
            info!(
                "[AetherNet/Trust] Peer {:?} vouched by {:?}, trust={:.3}",
                &peer_pubkey[..4],
                &voucher_pubkey[..4],
                record.score
            );
        }
    }

    /// Get the N most trusted peers.
    pub fn most_trusted(&self, n: usize) -> Vec<([u8; 32], f64)> {
        let mut records = self.records.lock().unwrap();
        let mut peers: Vec<_> = records
            .iter_mut()
            .filter(|(_, r)| !r.blacklisted)
            .map(|(k, r)| {
                r.recompute_score();
                (*k, r.score)
            })
            .collect();
        peers.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        peers.truncate(n);
        peers
    }

    /// Get the full trust record for a peer.
    pub fn get_record(&self, peer_pubkey: &[u8; 32]) -> Option<TrustRecord> {
        self.records.lock().ok()?.get(peer_pubkey).cloned()
    }

    /// Number of tracked peers.
    pub fn peer_count(&self) -> usize {
        self.records.lock().map(|r| r.len()).unwrap_or(0)
    }

    /// Remove stale peers (not seen in > 30 days and low trust).
    pub fn prune_stale(&self) -> usize {
        let threshold = now_secs() - 30 * 86400;
        let mut pruned = 0;
        if let Ok(mut records) = self.records.lock() {
            records.retain(|_, r| {
                let keep = r.last_seen >= threshold || r.score >= 0.5;
                if !keep {
                    pruned += 1;
                }
                keep
            });
        }
        if pruned > 0 {
            info!("[AetherNet/Trust] Pruned {} stale peers", pruned);
        }
        pruned
    }

    /// Serialize for persistence.
    pub fn serialize(&self) -> Option<Vec<u8>> {
        let records = self.records.lock().ok()?;
        bincode::serialize(&*records).ok()
    }

    /// Restore from serialized data.
    pub fn deserialize(&self, data: &[u8]) -> bool {
        match bincode::deserialize::<HashMap<[u8; 32], TrustRecord>>(data) {
            Ok(restored) => {
                if let Ok(mut records) = self.records.lock() {
                    *records = restored;
                }
                info!("[AetherNet/Trust] Trust map restored");
                true
            }
            Err(_) => false,
        }
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_peer_default_trust() {
        let map = TrustMap::new();
        let peer = [1u8; 32];
        let score = map.trust_score(&peer);
        assert!(score >= 0.4 && score <= 0.6, "Default trust should be ~0.5, got {}", score);
    }

    #[test]
    fn test_relay_success_increases_trust() {
        let map = TrustMap::new();
        let peer = [2u8; 32];
        let before = map.trust_score(&peer);
        for _ in 0..10 {
            map.record_relay_success(&peer, 100);
        }
        let after = map.trust_score(&peer);
        assert!(after > before, "Trust should increase after successes");
    }

    #[test]
    fn test_relay_failure_decreases_trust() {
        let map = TrustMap::new();
        let peer = [3u8; 32];
        // First add some successes
        for _ in 0..5 {
            map.record_relay_success(&peer, 100);
        }
        let before = map.trust_score(&peer);
        for _ in 0..5 {
            map.record_relay_failure(&peer);
        }
        let after = map.trust_score(&peer);
        assert!(after < before, "Trust should decrease after failures");
    }

    #[test]
    fn test_blacklist_on_low_trust() {
        let map = TrustMap::new();
        let peer = [4u8; 32];
        // Lots of suspicious behavior
        for _ in 0..10 {
            map.report_suspicious(&peer, PenaltyReason::TamperedMessage);
        }
        assert!(map.is_blacklisted(&peer));
    }
}
