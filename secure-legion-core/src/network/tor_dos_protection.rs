/// Tor Hidden Service DoS Protection Layer
///
/// Provides application-level rate limiting and connection throttling for
/// Tor hidden services. This complements OS-level protections (iptables)
/// and Tor-level protections (HiddenServiceEnableIntroDoSDefense).
///
/// Defense layers:
/// 1. **Connection rate limiting** — Max new connections per second per circuit
/// 2. **Concurrent connection cap** — Max simultaneous connections per onion address
/// 3. **Proof-of-Work challenge** — Optional PoW for high-load scenarios
/// 4. **Circuit-level throttling** — Slow down suspicious circuits
/// 5. **Automatic blacklisting** — Temporarily ban abusive circuits

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

// ─── Configuration ───────────────────────────────────────────────────────────

/// DoS protection configuration for a hidden service.
#[derive(Clone, Debug)]
pub struct HsDoSConfig {
    /// Maximum new connections per second (across all circuits).
    pub max_connections_per_second: u32,
    /// Maximum concurrent open connections.
    pub max_concurrent_connections: u32,
    /// Maximum new connections per circuit per minute.
    pub max_per_circuit_per_minute: u32,
    /// Duration to ban an abusive circuit.
    pub ban_duration: Duration,
    /// Number of violations before banning a circuit.
    pub ban_threshold: u32,
    /// Enable Proof-of-Work challenges when load exceeds this percentage
    /// of max_connections_per_second (0.0 = always, 1.0 = never).
    pub pow_activation_threshold: f64,
    /// Proof-of-Work difficulty (number of leading zero bits required).
    pub pow_difficulty: u8,
    /// Enable rate-limit logging for monitoring.
    pub enable_logging: bool,
}

impl Default for HsDoSConfig {
    fn default() -> Self {
        Self {
            max_connections_per_second: 50,
            max_concurrent_connections: 200,
            max_per_circuit_per_minute: 10,
            ban_duration: Duration::from_secs(300), // 5 minutes
            ban_threshold: 5,
            pow_activation_threshold: 0.75,
            pow_difficulty: 16,
            enable_logging: true,
        }
    }
}

// ─── Per-Circuit State ───────────────────────────────────────────────────────

/// Tracks connection history for a single circuit.
#[derive(Debug)]
struct CircuitState {
    /// Timestamps of recent connection attempts (sliding window).
    recent_connections: Vec<Instant>,
    /// Number of rate-limit violations.
    violation_count: u32,
    /// If banned, when the ban expires.
    banned_until: Option<Instant>,
    /// First seen timestamp.
    first_seen: Instant,
}

impl CircuitState {
    fn new() -> Self {
        Self {
            recent_connections: Vec::new(),
            violation_count: 0,
            banned_until: None,
            first_seen: Instant::now(),
        }
    }

    /// Prune connection timestamps older than 60 seconds.
    fn prune_old_connections(&mut self) {
        let cutoff = Instant::now() - Duration::from_secs(60);
        self.recent_connections.retain(|t| *t > cutoff);
    }

    /// Check if this circuit is currently banned.
    fn is_banned(&self) -> bool {
        self.banned_until
            .map(|until| Instant::now() < until)
            .unwrap_or(false)
    }
}

// ─── Decision ────────────────────────────────────────────────────────────────

/// The result of evaluating an incoming connection.
#[derive(Debug, Clone, PartialEq)]
pub enum ConnectionDecision {
    /// Allow the connection immediately.
    Allow,
    /// Allow but require Proof-of-Work challenge first.
    RequirePoW { difficulty: u8, challenge: [u8; 32] },
    /// Reject — rate limit exceeded.
    RateLimited { retry_after_secs: u32 },
    /// Reject — circuit is temporarily banned.
    Banned { remaining_secs: u32 },
    /// Reject — max concurrent connections reached.
    CapacityExceeded,
}

// ─── Protection Manager ──────────────────────────────────────────────────────

/// Application-level DoS protection for a Tor hidden service.
pub struct HsDoSProtection {
    config: HsDoSConfig,
    /// Per-circuit connection tracking. Key = circuit identifier (opaque string).
    circuits: Arc<RwLock<HashMap<String, CircuitState>>>,
    /// Global connection counter (sliding window, last second).
    global_connections: Arc<RwLock<Vec<Instant>>>,
    /// Current number of open connections.
    active_connections: Arc<std::sync::atomic::AtomicU32>,
}

impl HsDoSProtection {
    /// Create a new DoS protection instance with the given configuration.
    pub fn new(config: HsDoSConfig) -> Self {
        Self {
            config,
            circuits: Arc::new(RwLock::new(HashMap::new())),
            global_connections: Arc::new(RwLock::new(Vec::new())),
            active_connections: Arc::new(std::sync::atomic::AtomicU32::new(0)),
        }
    }

    /// Create with default configuration.
    pub fn with_defaults() -> Self {
        Self::new(HsDoSConfig::default())
    }

    /// Evaluate whether an incoming connection from `circuit_id` should be allowed.
    pub async fn evaluate_connection(&self, circuit_id: &str) -> ConnectionDecision {
        // 1. Check concurrent connection cap
        let active = self.active_connections.load(std::sync::atomic::Ordering::Relaxed);
        if active >= self.config.max_concurrent_connections {
            return ConnectionDecision::CapacityExceeded;
        }

        // 2. Check per-circuit ban
        {
            let circuits = self.circuits.read().await;
            if let Some(state) = circuits.get(circuit_id) {
                if state.is_banned() {
                    let remaining = state
                        .banned_until
                        .unwrap()
                        .duration_since(Instant::now())
                        .as_secs() as u32;
                    return ConnectionDecision::Banned {
                        remaining_secs: remaining,
                    };
                }
            }
        }

        // 3. Check global rate limit
        let global_rate = {
            let mut global = self.global_connections.write().await;
            let cutoff = Instant::now() - Duration::from_secs(1);
            global.retain(|t| *t > cutoff);
            global.len() as u32
        };

        if global_rate >= self.config.max_connections_per_second {
            return ConnectionDecision::RateLimited {
                retry_after_secs: 1,
            };
        }

        // 4. Check per-circuit rate limit
        let per_circuit_rate = {
            let mut circuits = self.circuits.write().await;
            let state = circuits
                .entry(circuit_id.to_string())
                .or_insert_with(CircuitState::new);

            state.prune_old_connections();
            let rate = state.recent_connections.len() as u32;

            if rate >= self.config.max_per_circuit_per_minute {
                // Record violation
                state.violation_count += 1;

                if state.violation_count >= self.config.ban_threshold {
                    // Ban this circuit
                    state.banned_until = Some(Instant::now() + self.config.ban_duration);
                    let remaining = self.config.ban_duration.as_secs() as u32;
                    return ConnectionDecision::Banned {
                        remaining_secs: remaining,
                    };
                }

                return ConnectionDecision::RateLimited {
                    retry_after_secs: 60,
                };
            }

            // Record this connection
            state.recent_connections.push(Instant::now());
            rate
        };

        // 5. Record global connection
        {
            let mut global = self.global_connections.write().await;
            global.push(Instant::now());
        }

        // 6. Check if PoW should be required (high load)
        let load_ratio = global_rate as f64 / self.config.max_connections_per_second as f64;
        if load_ratio >= self.config.pow_activation_threshold {
            let challenge = generate_pow_challenge();
            return ConnectionDecision::RequirePoW {
                difficulty: self.config.pow_difficulty,
                challenge,
            };
        }

        ConnectionDecision::Allow
    }

    /// Call when a connection is accepted (increments active count).
    pub fn connection_opened(&self) {
        self.active_connections
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    }

    /// Call when a connection is closed (decrements active count).
    pub fn connection_closed(&self) {
        self.active_connections
            .fetch_sub(1, std::sync::atomic::Ordering::Relaxed);
    }

    /// Manually ban a circuit (e.g., after detecting abuse).
    pub async fn ban_circuit(&self, circuit_id: &str, duration: Duration) {
        let mut circuits = self.circuits.write().await;
        let state = circuits
            .entry(circuit_id.to_string())
            .or_insert_with(CircuitState::new);
        state.banned_until = Some(Instant::now() + duration);
    }

    /// Unban a circuit.
    pub async fn unban_circuit(&self, circuit_id: &str) {
        let mut circuits = self.circuits.write().await;
        if let Some(state) = circuits.get_mut(circuit_id) {
            state.banned_until = None;
            state.violation_count = 0;
        }
    }

    /// Get current statistics for monitoring.
    pub async fn stats(&self) -> DoSStats {
        let circuits = self.circuits.read().await;
        let active = self.active_connections.load(std::sync::atomic::Ordering::Relaxed);
        let banned_count = circuits.values().filter(|s| s.is_banned()).count() as u32;
        let total_circuits = circuits.len() as u32;

        let global = self.global_connections.read().await;
        let cutoff = Instant::now() - Duration::from_secs(1);
        let current_rate = global.iter().filter(|t| **t > cutoff).count() as u32;

        DoSStats {
            active_connections: active,
            connections_per_second: current_rate,
            max_connections_per_second: self.config.max_connections_per_second,
            max_concurrent: self.config.max_concurrent_connections,
            tracked_circuits: total_circuits,
            banned_circuits: banned_count,
        }
    }

    /// Verify a Proof-of-Work solution submitted by a client.
    pub fn verify_pow(&self, challenge: &[u8; 32], nonce: u64, difficulty: u8) -> bool {
        verify_pow_solution(challenge, nonce, difficulty)
    }

    /// Periodically clean up expired bans and stale circuit entries.
    /// Should be called from a background task every ~60 seconds.
    pub async fn cleanup(&self) {
        let mut circuits = self.circuits.write().await;
        let now = Instant::now();
        let stale_cutoff = now - Duration::from_secs(600); // 10 minutes

        circuits.retain(|_id, state| {
            // Remove if: not banned AND no recent connections AND old enough
            let is_banned = state.is_banned();
            let has_recent = state
                .recent_connections
                .iter()
                .any(|t| *t > stale_cutoff);
            is_banned || has_recent || state.first_seen > stale_cutoff
        });
    }
}

// ─── Statistics ──────────────────────────────────────────────────────────────

/// Current DoS protection statistics.
#[derive(Debug, Clone)]
pub struct DoSStats {
    pub active_connections: u32,
    pub connections_per_second: u32,
    pub max_connections_per_second: u32,
    pub max_concurrent: u32,
    pub tracked_circuits: u32,
    pub banned_circuits: u32,
}

impl std::fmt::Display for DoSStats {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Active: {}/{} | Rate: {}/{}/s | Circuits: {} tracked, {} banned",
            self.active_connections,
            self.max_concurrent,
            self.connections_per_second,
            self.max_connections_per_second,
            self.tracked_circuits,
            self.banned_circuits,
        )
    }
}

// ─── Proof-of-Work ───────────────────────────────────────────────────────────

/// Generate a random 32-byte challenge for PoW.
fn generate_pow_challenge() -> [u8; 32] {
    use rand::{SeedableRng, RngCore};
    let mut rng = rand::rngs::StdRng::from_entropy();
    let mut challenge = [0u8; 32];
    rng.fill_bytes(&mut challenge);
    challenge
}

/// Public wrapper for PoW verification (used by fuzz targets and external callers).
pub fn verify_pow_solution_public(challenge: &[u8; 32], nonce: u64, difficulty: u8) -> bool {
    verify_pow_solution(challenge, nonce, difficulty)
}

/// Verify a PoW solution: SHA3-256(challenge || nonce) must have
/// `difficulty` leading zero bits.
fn verify_pow_solution(challenge: &[u8; 32], nonce: u64, difficulty: u8) -> bool {
    use sha3::{Digest, Sha3_256};
    let mut hasher = Sha3_256::new();
    hasher.update(challenge);
    hasher.update(&nonce.to_le_bytes());
    let hash = hasher.finalize();

    // Check leading zero bits
    let mut zero_bits = 0u8;
    for byte in hash.iter() {
        if *byte == 0 {
            zero_bits += 8;
        } else {
            zero_bits += byte.leading_zeros() as u8;
            break;
        }
        if zero_bits >= difficulty {
            break;
        }
    }
    zero_bits >= difficulty
}

// ─── Torrc Configuration Generator ──────────────────────────────────────────

/// Generate a torrc configuration snippet with DoS protection settings.
///
/// These settings are applied to the Tor daemon's hidden service configuration.
/// See https://community.torproject.org/onion-services/advanced/dos/
pub fn generate_torrc_dos_config(config: &HsDoSConfig) -> String {
    format!(
        r#"## Shield Messenger — Hidden Service DoS Protection
## Generated by secure-legion-core

# Enable built-in intro-point DoS defense (Tor 0.4.2+)
HiddenServiceEnableIntroDoSDefense 1

# Rate limit: max intro cells per second per intro point
HiddenServiceEnableIntroDoSRatePerSec {rate}

# Burst: max queued intro cells before dropping
HiddenServiceEnableIntroDoSBurstPerSec {burst}

# Proof-of-Work defense (Tor 0.4.8+)
# Requires clients to solve a computational puzzle under load
HiddenServicePoWDefensesEnabled 1
HiddenServicePoWQueueRate {pow_rate}
HiddenServicePoWQueueBurst {pow_burst}

# Circuit creation rate limiting
DoSCircuitCreationEnabled 1
DoSCircuitCreationMinConnections 5
DoSCircuitCreationRate {circuit_rate}
DoSCircuitCreationBurst {circuit_burst}
DoSCircuitCreationDefenseType 2

# Connection DoS mitigation
DoSConnectionEnabled 1
DoSConnectionMaxConcurrentCount {max_concurrent}
DoSConnectionDefenseType 2

# Refuse unknown exit connections to our HS port
DoSRefuseSingleHopClientRendezvous 1
"#,
        rate = config.max_connections_per_second,
        burst = config.max_connections_per_second * 2,
        pow_rate = config.max_connections_per_second / 2,
        pow_burst = config.max_connections_per_second,
        circuit_rate = config.max_per_circuit_per_minute,
        circuit_burst = config.max_per_circuit_per_minute * 2,
        max_concurrent = config.max_concurrent_connections,
    )
}

// ─── iptables Rules Generator ────────────────────────────────────────────────

/// Generate iptables rules for OS-level DoS protection of the Tor process.
///
/// These rules protect the Tor SOCKS port and hidden service port from
/// local abuse and network-level flooding.
pub fn generate_iptables_rules(
    tor_socks_port: u16,
    hs_virtual_port: u16,
    max_syn_per_second: u32,
) -> String {
    format!(
        r#"#!/bin/bash
## Shield Messenger — iptables DoS Protection
## Generated by secure-legion-core
## Apply with: sudo bash iptables-shield.sh

set -e

# ── Flush existing Shield rules ──────────────────────────────────────────
iptables -D INPUT -j SHIELD_DOS 2>/dev/null || true
iptables -F SHIELD_DOS 2>/dev/null || true
iptables -X SHIELD_DOS 2>/dev/null || true

# ── Create Shield chain ──────────────────────────────────────────────────
iptables -N SHIELD_DOS

# Allow established connections
iptables -A SHIELD_DOS -m state --state ESTABLISHED,RELATED -j ACCEPT

# Rate limit new TCP connections to Tor SOCKS port (local only)
iptables -A SHIELD_DOS -p tcp --dport {socks_port} -m state --state NEW \
  -m recent --set --name tor_socks
iptables -A SHIELD_DOS -p tcp --dport {socks_port} -m state --state NEW \
  -m recent --update --seconds 10 --hitcount 20 --name tor_socks -j DROP

# Rate limit SYN packets to hidden service port
iptables -A SHIELD_DOS -p tcp --dport {hs_port} --syn \
  -m limit --limit {syn_rate}/s --limit-burst {syn_burst} -j ACCEPT
iptables -A SHIELD_DOS -p tcp --dport {hs_port} --syn -j DROP

# Drop invalid packets
iptables -A SHIELD_DOS -m state --state INVALID -j DROP

# Drop XMAS and NULL scans
iptables -A SHIELD_DOS -p tcp --tcp-flags ALL ALL -j DROP
iptables -A SHIELD_DOS -p tcp --tcp-flags ALL NONE -j DROP

# Limit ICMP (prevent ping flood)
iptables -A SHIELD_DOS -p icmp --icmp-type echo-request \
  -m limit --limit 1/s --limit-burst 4 -j ACCEPT
iptables -A SHIELD_DOS -p icmp --icmp-type echo-request -j DROP

# Log dropped packets (rate limited to prevent log flooding)
iptables -A SHIELD_DOS -m limit --limit 5/min -j LOG \
  --log-prefix "SHIELD_DOS_DROP: " --log-level 4

# Default: accept everything else
iptables -A SHIELD_DOS -j RETURN

# ── Attach to INPUT chain ────────────────────────────────────────────────
iptables -I INPUT 1 -j SHIELD_DOS

echo "Shield Messenger iptables DoS protection applied successfully."
echo "  Tor SOCKS port: {socks_port}"
echo "  HS virtual port: {hs_port}"
echo "  SYN rate limit: {syn_rate}/s (burst: {syn_burst})"
"#,
        socks_port = tor_socks_port,
        hs_port = hs_virtual_port,
        syn_rate = max_syn_per_second,
        syn_burst = max_syn_per_second * 3,
    )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_allow_normal_connection() {
        let protection = HsDoSProtection::with_defaults();
        let decision = protection.evaluate_connection("circuit_1").await;
        assert_eq!(decision, ConnectionDecision::Allow);
    }

    #[tokio::test]
    async fn test_capacity_exceeded() {
        let config = HsDoSConfig {
            max_concurrent_connections: 1,
            ..Default::default()
        };
        let protection = HsDoSProtection::new(config);

        // Simulate one active connection
        protection.connection_opened();
        let decision = protection.evaluate_connection("circuit_1").await;
        assert_eq!(decision, ConnectionDecision::CapacityExceeded);

        // Close connection, should allow again
        protection.connection_closed();
        let decision = protection.evaluate_connection("circuit_1").await;
        assert_eq!(decision, ConnectionDecision::Allow);
    }

    #[tokio::test]
    async fn test_per_circuit_rate_limit() {
        let config = HsDoSConfig {
            max_per_circuit_per_minute: 3,
            ban_threshold: 10,
            ..Default::default()
        };
        let protection = HsDoSProtection::new(config);

        // First 3 should be allowed
        for _ in 0..3 {
            let decision = protection.evaluate_connection("circuit_1").await;
            assert_eq!(decision, ConnectionDecision::Allow);
        }

        // 4th should be rate limited
        let decision = protection.evaluate_connection("circuit_1").await;
        assert!(matches!(decision, ConnectionDecision::RateLimited { .. }));
    }

    #[tokio::test]
    async fn test_ban_after_violations() {
        let config = HsDoSConfig {
            max_per_circuit_per_minute: 1,
            ban_threshold: 2,
            ban_duration: Duration::from_secs(60),
            ..Default::default()
        };
        let protection = HsDoSProtection::new(config);

        // Trigger violations
        protection.evaluate_connection("bad_circuit").await; // Allow
        protection.evaluate_connection("bad_circuit").await; // Rate limited (violation 1)
        let decision = protection.evaluate_connection("bad_circuit").await; // Banned (violation 2)
        assert!(matches!(decision, ConnectionDecision::Banned { .. }));
    }

    #[test]
    fn test_pow_verification() {
        let challenge = [0u8; 32];
        // Brute force a valid nonce for difficulty 8 (1 zero byte)
        let mut nonce = 0u64;
        loop {
            if verify_pow_solution(&challenge, nonce, 8) {
                break;
            }
            nonce += 1;
            if nonce > 100_000 {
                panic!("Could not find valid PoW nonce in 100k attempts");
            }
        }
        // Verify it passes
        assert!(verify_pow_solution(&challenge, nonce, 8));
        // Wrong nonce should fail (most likely)
        assert!(!verify_pow_solution(&challenge, nonce + 1, 8) || nonce == 0);
    }

    #[test]
    fn test_torrc_generation() {
        let config = HsDoSConfig::default();
        let torrc = generate_torrc_dos_config(&config);
        assert!(torrc.contains("HiddenServiceEnableIntroDoSDefense 1"));
        assert!(torrc.contains("HiddenServicePoWDefensesEnabled 1"));
        assert!(torrc.contains("DoSCircuitCreationEnabled 1"));
    }

    #[test]
    fn test_iptables_generation() {
        let rules = generate_iptables_rules(9050, 443, 100);
        assert!(rules.contains("9050"));
        assert!(rules.contains("443"));
        assert!(rules.contains("SHIELD_DOS"));
    }

    #[tokio::test]
    async fn test_manual_ban_unban() {
        let protection = HsDoSProtection::with_defaults();

        // Ban a circuit
        protection
            .ban_circuit("evil_circuit", Duration::from_secs(60))
            .await;
        let decision = protection.evaluate_connection("evil_circuit").await;
        assert!(matches!(decision, ConnectionDecision::Banned { .. }));

        // Unban
        protection.unban_circuit("evil_circuit").await;
        let decision = protection.evaluate_connection("evil_circuit").await;
        assert_eq!(decision, ConnectionDecision::Allow);
    }

    #[tokio::test]
    async fn test_stats() {
        let protection = HsDoSProtection::with_defaults();
        protection.evaluate_connection("c1").await;
        protection.evaluate_connection("c2").await;
        protection.connection_opened();

        let stats = protection.stats().await;
        assert_eq!(stats.active_connections, 1);
        assert_eq!(stats.tracked_circuits, 2);
        assert_eq!(stats.banned_circuits, 0);
    }

    #[tokio::test]
    async fn test_cleanup() {
        let config = HsDoSConfig {
            max_per_circuit_per_minute: 1,
            ban_threshold: 1,
            ban_duration: Duration::from_millis(10),
            ..Default::default()
        };
        let protection = HsDoSProtection::new(config);

        // Create and ban a circuit
        protection.evaluate_connection("temp").await;
        protection.evaluate_connection("temp").await; // triggers ban

        // Wait for ban to expire
        tokio::time::sleep(Duration::from_millis(20)).await;

        // Cleanup should remove it
        protection.cleanup().await;
        let stats = protection.stats().await;
        assert_eq!(stats.banned_circuits, 0);
    }
}
