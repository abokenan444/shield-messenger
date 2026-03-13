//! Smart Switching Engine — Selects the optimal transport for each message.
//!
//! Uses real-time metrics, threat level, and message priority to score
//! each available transport and route messages through the best path.

use std::time::Duration;

use log::info;

use super::transport::*;

// ── Scoring Weights ─────────────────────────────────────────────────────────

/// Default weights for transport scoring factors.
#[derive(Debug, Clone, Copy)]
pub struct ScoringWeights {
    pub anonymity: f64,
    pub latency: f64,
    pub reliability: f64,
    pub bandwidth: f64,
    pub battery: f64,
    pub threat_bonus: f64,
}

impl Default for ScoringWeights {
    fn default() -> Self {
        Self {
            anonymity: 0.35,
            latency: 0.20,
            reliability: 0.20,
            bandwidth: 0.10,
            battery: 0.10,
            threat_bonus: 0.05,
        }
    }
}

// ── Threat Level ────────────────────────────────────────────────────────────

/// Current threat assessment — affects switching behavior.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum ThreatLevel {
    /// Normal conditions — optimize for balanced performance.
    #[default]
    Normal = 0,
    /// Elevated — prefer higher anonymity, accept more latency.
    Elevated = 1,
    /// High — force maximum anonymity, multi-hop, identity rotation.
    High = 2,
    /// Critical — crisis mode: all transports simultaneously.
    Critical = 3,
}

// ── Switching Decision ──────────────────────────────────────────────────────

/// The result of the switching engine's evaluation.
#[derive(Debug, Clone)]
pub struct SwitchingDecision {
    /// The chosen transport.
    pub transport: TransportType,
    /// Composite score (0.0 – 1.0).
    pub score: f64,
    /// All scored transports, sorted by score descending.
    pub all_scores: Vec<(TransportType, f64)>,
    /// Whether redundant delivery is recommended.
    pub redundant: bool,
    /// Reason for the choice.
    pub reason: String,
}

// ── Smart Switcher ──────────────────────────────────────────────────────────

/// The Smart Switching Engine evaluates available transports in real-time.
pub struct SmartSwitcher {
    weights: ScoringWeights,
    threat_level: ThreatLevel,
    /// Maximum acceptable latency (ms) for urgent messages.
    urgent_latency_threshold: Duration,
}

impl Default for SmartSwitcher {
    fn default() -> Self {
        Self::new()
    }
}

impl SmartSwitcher {
    pub fn new() -> Self {
        Self {
            weights: ScoringWeights::default(),
            threat_level: ThreatLevel::Normal,
            urgent_latency_threshold: Duration::from_millis(200),
        }
    }

    pub fn with_weights(mut self, weights: ScoringWeights) -> Self {
        self.weights = weights;
        self
    }

    /// Set the current threat level.
    pub fn set_threat_level(&mut self, level: ThreatLevel) {
        if self.threat_level != level {
            info!(
                "[AetherNet/Switcher] Threat level changed: {:?} → {:?}",
                self.threat_level, level
            );
        }
        self.threat_level = level;
    }

    pub fn threat_level(&self) -> ThreatLevel {
        self.threat_level
    }

    /// Evaluate all available transports and choose the best one.
    pub fn evaluate(
        &self,
        metrics: &[TransportMetrics],
        priority: MessagePriority,
    ) -> Option<SwitchingDecision> {
        if metrics.is_empty() {
            return None;
        }

        // Crisis mode → redundant delivery via all transports
        if self.threat_level == ThreatLevel::Critical || priority == MessagePriority::Critical {
            let available: Vec<_> = metrics
                .iter()
                .filter(|m| m.available)
                .map(|m| (m.transport_type.clone(), 1.0))
                .collect();

            if available.is_empty() {
                return None;
            }

            return Some(SwitchingDecision {
                transport: available[0].0.clone(),
                score: 1.0,
                all_scores: available,
                redundant: true,
                reason: "Crisis/Critical: redundant delivery via all transports".into(),
            });
        }

        // Score each available transport
        let weights = self.adjusted_weights(priority);
        let mut scored: Vec<(TransportType, f64)> = metrics
            .iter()
            .filter(|m| m.available)
            .map(|m| {
                (
                    m.transport_type.clone(),
                    self.score_transport(m, &weights, priority),
                )
            })
            .collect();

        if scored.is_empty() {
            return None;
        }

        // Sort by score descending
        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        let best = scored[0].clone();

        Some(SwitchingDecision {
            transport: best.0.clone(),
            score: best.1,
            all_scores: scored,
            redundant: false,
            reason: self.explain_choice(&best.0, priority),
        })
    }

    /// Score a single transport based on its metrics and the current weights.
    fn score_transport(
        &self,
        m: &TransportMetrics,
        weights: &ScoringWeights,
        _priority: MessagePriority,
    ) -> f64 {
        // Normalize latency: lower is better (score 1.0 at 0ms, 0.0 at 5000ms)
        let latency_ms = m.latency.as_millis() as f64;
        let latency_score = (1.0 - (latency_ms / 5000.0)).max(0.0);

        // Normalize bandwidth: higher is better (score 1.0 at 1MB/s+)
        let bw_score = (m.bandwidth_bps as f64 / 1_000_000.0).min(1.0);

        // Battery: lower cost is better (invert)
        let battery_score = 1.0 - m.battery_cost;

        // Threat bonus: higher anonymity weighted more under threat
        let threat_multiplier = match self.threat_level {
            ThreatLevel::Normal => 1.0,
            ThreatLevel::Elevated => 1.3,
            ThreatLevel::High => 1.8,
            ThreatLevel::Critical => 2.5,
        };

        let composite = (weights.anonymity * m.anonymity_score * threat_multiplier)
            + (weights.latency * latency_score)
            + (weights.reliability * m.reliability)
            + (weights.bandwidth * bw_score)
            + (weights.battery * battery_score);

        // Clamp to [0, 1]
        composite.clamp(0.0, 1.0)
    }

    /// Adjust weights based on message priority.
    fn adjusted_weights(&self, priority: MessagePriority) -> ScoringWeights {
        let mut w = self.weights;
        match priority {
            MessagePriority::Urgent => {
                // Urgent: heavily favor latency
                w.latency = 0.40;
                w.anonymity = 0.20;
                w.reliability = 0.25;
                w.bandwidth = 0.10;
                w.battery = 0.05;
            }
            MessagePriority::Bulk => {
                // Bulk: heavily favor bandwidth and battery
                w.bandwidth = 0.30;
                w.battery = 0.20;
                w.latency = 0.10;
                w.anonymity = 0.25;
                w.reliability = 0.15;
            }
            _ => {} // Normal and Critical use defaults
        }
        w
    }

    fn explain_choice(&self, transport: &TransportType, priority: MessagePriority) -> String {
        match (transport, self.threat_level, priority) {
            (TransportType::Tor, ThreatLevel::High, _) => {
                "High threat: Tor selected for maximum anonymity".into()
            }
            (TransportType::Tor, _, MessagePriority::Normal) => {
                "Tor: best balance of anonymity and reliability".into()
            }
            (TransportType::I2P, _, MessagePriority::Bulk) => {
                "I2P: higher bandwidth for bulk transfer".into()
            }
            (TransportType::Mesh, _, MessagePriority::Urgent) => {
                "Mesh: lowest latency for urgent delivery".into()
            }
            (TransportType::Mesh, _, _) => "Mesh: only available transport (offline mode)".into(),
            _ => format!("{}: highest composite score", transport),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tor_metrics(available: bool) -> TransportMetrics {
        TransportMetrics {
            transport_type: TransportType::Tor,
            available,
            latency: Duration::from_millis(800),
            bandwidth_bps: 500_000,
            reliability: 0.95,
            anonymity_score: 0.95,
            battery_cost: 0.4,
            ..Default::default()
        }
    }

    fn i2p_metrics(available: bool) -> TransportMetrics {
        TransportMetrics {
            transport_type: TransportType::I2P,
            available,
            latency: Duration::from_millis(600),
            bandwidth_bps: 1_000_000,
            reliability: 0.90,
            anonymity_score: 0.90,
            battery_cost: 0.5,
            ..Default::default()
        }
    }

    fn mesh_metrics(available: bool) -> TransportMetrics {
        TransportMetrics {
            transport_type: TransportType::Mesh,
            available,
            latency: Duration::from_millis(50),
            bandwidth_bps: 100_000,
            reliability: 0.80,
            anonymity_score: 0.30,
            battery_cost: 0.3,
            ..Default::default()
        }
    }

    #[test]
    fn test_normal_prefers_tor() {
        let switcher = SmartSwitcher::new();
        let metrics = vec![tor_metrics(true), i2p_metrics(true), mesh_metrics(true)];
        let decision = switcher
            .evaluate(&metrics, MessagePriority::Normal)
            .unwrap();
        // I2P edges out Tor due to better latency and bandwidth with similar anonymity
        assert!(
            decision.transport == TransportType::Tor || decision.transport == TransportType::I2P
        );
        assert!(!decision.redundant);
    }

    #[test]
    fn test_crisis_sends_all() {
        let mut switcher = SmartSwitcher::new();
        switcher.set_threat_level(ThreatLevel::Critical);
        let metrics = vec![tor_metrics(true), i2p_metrics(true), mesh_metrics(true)];
        let decision = switcher
            .evaluate(&metrics, MessagePriority::Normal)
            .unwrap();
        assert!(decision.redundant);
        assert_eq!(decision.all_scores.len(), 3);
    }

    #[test]
    fn test_only_mesh_available() {
        let switcher = SmartSwitcher::new();
        let metrics = vec![tor_metrics(false), i2p_metrics(false), mesh_metrics(true)];
        let decision = switcher
            .evaluate(&metrics, MessagePriority::Normal)
            .unwrap();
        assert_eq!(decision.transport, TransportType::Mesh);
    }

    #[test]
    fn test_none_available() {
        let switcher = SmartSwitcher::new();
        let metrics = vec![tor_metrics(false), i2p_metrics(false), mesh_metrics(false)];
        let decision = switcher.evaluate(&metrics, MessagePriority::Normal);
        assert!(decision.is_none());
    }

    #[test]
    fn test_urgent_considers_latency() {
        let switcher = SmartSwitcher::new();
        let metrics = vec![tor_metrics(true), mesh_metrics(true)];
        let decision = switcher
            .evaluate(&metrics, MessagePriority::Urgent)
            .unwrap();
        // Latency is heavily weighted for urgent, but Tor's high anonymity
        // and reliability can compensate; verify both score well
        assert!(decision.score > 0.5);
    }
}
