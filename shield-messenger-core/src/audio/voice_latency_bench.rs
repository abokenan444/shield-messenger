/// Voice Call Latency Benchmarking over Tor
///
/// Measures end-to-end voice call performance metrics including:
/// - Codec latency (Opus encode/decode)
/// - Network round-trip time over Tor circuits
/// - Jitter buffer effectiveness
/// - Packet loss impact on audio quality
///
/// These benchmarks help tune voice call parameters for optimal
/// quality over high-latency Tor connections.
use std::time::{Duration, Instant};

/// Voice call performance metrics
#[derive(Clone, Debug)]
pub struct VoiceCallMetrics {
    /// Opus codec encoding latency (microseconds)
    pub encode_latency_us: u64,
    /// Opus codec decoding latency (microseconds)
    pub decode_latency_us: u64,
    /// Network round-trip time (milliseconds)
    pub network_rtt_ms: u64,
    /// Total end-to-end latency (milliseconds)
    pub e2e_latency_ms: u64,
    /// Jitter (standard deviation of RTT, milliseconds)
    pub jitter_ms: u64,
    /// Packet loss percentage (0.0 - 100.0)
    pub packet_loss_pct: f64,
    /// Audio quality score (1-5, MOS-like)
    pub quality_score: f64,
    /// Number of samples measured
    pub sample_count: u64,
}

impl std::fmt::Display for VoiceCallMetrics {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Voice Call Metrics ({} samples):\n\
             ├─ Codec: encode={} µs, decode={} µs\n\
             ├─ Network: RTT={} ms, jitter={} ms\n\
             ├─ E2E latency: {} ms\n\
             ├─ Packet loss: {:.1}%\n\
             └─ Quality score: {:.1}/5.0 (MOS)",
            self.sample_count,
            self.encode_latency_us,
            self.decode_latency_us,
            self.network_rtt_ms,
            self.jitter_ms,
            self.e2e_latency_ms,
            self.packet_loss_pct,
            self.quality_score,
        )
    }
}

/// Benchmark configuration
#[derive(Clone, Debug)]
pub struct BenchConfig {
    /// Number of audio frames to test
    pub frame_count: u32,
    /// Opus frame size in samples (default: 960 = 20ms at 48kHz)
    pub frame_size: u32,
    /// Sample rate (default: 48000)
    pub sample_rate: u32,
    /// Opus bitrate (default: 24000 bps — optimized for Tor)
    pub bitrate: u32,
    /// Simulated network RTT range [min, max] in milliseconds
    pub simulated_rtt_range_ms: (u64, u64),
    /// Simulated packet loss percentage
    pub simulated_loss_pct: f64,
}

impl Default for BenchConfig {
    fn default() -> Self {
        Self {
            frame_count: 1000,
            frame_size: 960, // 20ms at 48kHz
            sample_rate: 48000,
            bitrate: 24000,                     // 24 kbps — good quality over Tor
            simulated_rtt_range_ms: (300, 800), // Typical Tor latency
            simulated_loss_pct: 5.0,
        }
    }
}

/// Tor-specific voice call quality thresholds
///
/// Based on ITU-T G.114 recommendations adapted for Tor network conditions.
#[derive(Clone, Debug)]
pub struct QualityThresholds {
    /// Maximum acceptable one-way latency (ms)
    pub max_one_way_latency_ms: u64,
    /// Maximum acceptable jitter (ms)
    pub max_jitter_ms: u64,
    /// Maximum acceptable packet loss (%)
    pub max_packet_loss_pct: f64,
    /// Minimum acceptable MOS score
    pub min_mos_score: f64,
}

impl QualityThresholds {
    /// Standard thresholds for Tor voice calls
    /// (more lenient than traditional VoIP due to Tor overhead)
    pub fn tor_standard() -> Self {
        Self {
            max_one_way_latency_ms: 500, // ITU-T G.114: 150ms ideal, 400ms max for PSTN
            max_jitter_ms: 100,
            max_packet_loss_pct: 10.0,
            min_mos_score: 2.5, // "Fair" quality — acceptable for secure comms
        }
    }

    /// Strict thresholds (for high-quality connections)
    pub fn strict() -> Self {
        Self {
            max_one_way_latency_ms: 300,
            max_jitter_ms: 50,
            max_packet_loss_pct: 3.0,
            min_mos_score: 3.5,
        }
    }

    /// Check if metrics meet the thresholds
    pub fn evaluate(&self, metrics: &VoiceCallMetrics) -> QualityAssessment {
        let one_way = metrics.e2e_latency_ms / 2;
        let latency_ok = one_way <= self.max_one_way_latency_ms;
        let jitter_ok = metrics.jitter_ms <= self.max_jitter_ms;
        let loss_ok = metrics.packet_loss_pct <= self.max_packet_loss_pct;
        let mos_ok = metrics.quality_score >= self.min_mos_score;

        let all_pass = latency_ok && jitter_ok && loss_ok && mos_ok;

        QualityAssessment {
            overall_pass: all_pass,
            latency_pass: latency_ok,
            jitter_pass: jitter_ok,
            packet_loss_pass: loss_ok,
            mos_pass: mos_ok,
            recommendation: if all_pass {
                "Voice call quality meets requirements for secure communication over Tor."
                    .to_string()
            } else {
                let mut issues = Vec::new();
                if !latency_ok {
                    issues.push(format!(
                        "Latency too high: {}ms one-way (max {}ms)",
                        one_way, self.max_one_way_latency_ms
                    ));
                }
                if !jitter_ok {
                    issues.push(format!(
                        "Jitter too high: {}ms (max {}ms)",
                        metrics.jitter_ms, self.max_jitter_ms
                    ));
                }
                if !loss_ok {
                    issues.push(format!(
                        "Packet loss too high: {:.1}% (max {:.1}%)",
                        metrics.packet_loss_pct, self.max_packet_loss_pct
                    ));
                }
                if !mos_ok {
                    issues.push(format!(
                        "Quality score too low: {:.1} (min {:.1})",
                        metrics.quality_score, self.min_mos_score
                    ));
                }
                format!("Issues: {}", issues.join("; "))
            },
        }
    }
}

/// Result of quality assessment
#[derive(Clone, Debug)]
pub struct QualityAssessment {
    pub overall_pass: bool,
    pub latency_pass: bool,
    pub jitter_pass: bool,
    pub packet_loss_pass: bool,
    pub mos_pass: bool,
    pub recommendation: String,
}

impl std::fmt::Display for QualityAssessment {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let status = if self.overall_pass { "PASS" } else { "FAIL" };
        write!(
            f,
            "Quality Assessment: {}\n\
             ├─ Latency: {}\n\
             ├─ Jitter: {}\n\
             ├─ Packet Loss: {}\n\
             ├─ MOS Score: {}\n\
             └─ {}",
            status,
            if self.latency_pass { "OK" } else { "FAIL" },
            if self.jitter_pass { "OK" } else { "FAIL" },
            if self.packet_loss_pass { "OK" } else { "FAIL" },
            if self.mos_pass { "OK" } else { "FAIL" },
            self.recommendation,
        )
    }
}

/// Estimate MOS (Mean Opinion Score) from network metrics.
///
/// Uses the E-model (ITU-T G.107) simplified formula adapted for Opus codec
/// over Tor. The R-factor is computed and mapped to MOS (1-5 scale).
///
/// Parameters:
/// - `rtt_ms`: Round-trip time in milliseconds
/// - `jitter_ms`: Jitter in milliseconds
/// - `loss_pct`: Packet loss percentage (0-100)
/// - `codec_delay_ms`: Codec encoding + decoding delay
pub fn estimate_mos(rtt_ms: u64, jitter_ms: u64, loss_pct: f64, codec_delay_ms: u64) -> f64 {
    // One-way delay (half RTT + codec + jitter buffer)
    let one_way_delay = (rtt_ms as f64 / 2.0) + codec_delay_ms as f64 + (jitter_ms as f64 * 2.0);

    // R-factor calculation (simplified E-model)
    // R = 93.2 - Id - Ie_eff
    // where:
    //   Id = delay impairment
    //   Ie_eff = equipment impairment (codec + loss)

    // Delay impairment (Id)
    let id = if one_way_delay < 177.3 {
        0.024 * one_way_delay + 0.11 * (one_way_delay - 177.3) * step(one_way_delay - 177.3)
    } else {
        0.024 * one_way_delay + 0.11 * (one_way_delay - 177.3)
    };

    // Equipment impairment for Opus codec (Ie = 0 for wideband Opus)
    // Loss impairment: Ie_eff = Ie + (95 - Ie) * loss / (loss + Bpl)
    let ie = 0.0; // Opus has very low intrinsic impairment
    let bpl = 25.0; // Packet loss robustness factor for Opus with FEC
    let ie_eff = ie + (95.0 - ie) * loss_pct / (loss_pct + bpl);

    // R-factor
    let r = (93.2 - id - ie_eff).clamp(0.0, 100.0);

    // R to MOS conversion
    let mos = if r < 6.5 {
        1.0
    } else if r > 100.0 {
        4.5
    } else {
        1.0 + 0.035 * r + r * (r - 60.0) * (100.0 - r) * 7.0e-6
    };

    mos.clamp(1.0, 5.0)
}

/// Step function for E-model calculation
fn step(x: f64) -> f64 {
    if x >= 0.0 {
        1.0
    } else {
        0.0
    }
}

/// Run a simulated voice call benchmark (no actual network I/O).
///
/// This measures codec performance and estimates quality based on
/// simulated Tor network conditions.
pub fn run_simulated_bench(config: &BenchConfig) -> VoiceCallMetrics {
    let mut encode_times = Vec::with_capacity(config.frame_count as usize);
    let mut decode_times = Vec::with_capacity(config.frame_count as usize);

    // Generate test audio (sine wave at 440 Hz)
    let samples_per_frame = config.frame_size as usize;
    let mut audio_frame = vec![0i16; samples_per_frame];
    for (i, sample) in audio_frame.iter_mut().enumerate() {
        let t = i as f64 / config.sample_rate as f64;
        *sample = (f64::sin(2.0 * std::f64::consts::PI * 440.0 * t) * 16384.0) as i16;
    }

    // Simulate encode/decode timing
    // (In production, this would use the actual Opus codec)
    for _ in 0..config.frame_count {
        // Simulate encode
        let start = Instant::now();
        // Opus encode: typically 50-200µs per 20ms frame
        let encode_work: u64 = audio_frame
            .iter()
            .map(|&s| (s as u64).wrapping_mul(7))
            .sum();
        let _ = encode_work; // Prevent optimization
        let encode_time = start.elapsed();
        encode_times.push(encode_time);

        // Simulate decode
        let start = Instant::now();
        let decode_work: u64 = audio_frame
            .iter()
            .map(|&s| (s as u64).wrapping_add(3))
            .sum();
        let _ = decode_work;
        let decode_time = start.elapsed();
        decode_times.push(decode_time);
    }

    // Calculate codec latencies
    let avg_encode_us = encode_times
        .iter()
        .map(|d| d.as_micros() as u64)
        .sum::<u64>()
        / config.frame_count as u64;
    let avg_decode_us = decode_times
        .iter()
        .map(|d| d.as_micros() as u64)
        .sum::<u64>()
        / config.frame_count as u64;

    // Simulate network conditions
    let (rtt_min, rtt_max) = config.simulated_rtt_range_ms;
    let avg_rtt = (rtt_min + rtt_max) / 2;
    let jitter = (rtt_max - rtt_min) / 4; // Approximate jitter as 1/4 of RTT range

    // Frame duration in ms
    let frame_duration_ms = (config.frame_size as u64 * 1000) / config.sample_rate as u64;

    // Total E2E latency: codec encode + network RTT/2 + jitter buffer + codec decode
    let codec_delay_ms = (avg_encode_us + avg_decode_us) / 1000;
    let jitter_buffer_ms = jitter * 2; // Jitter buffer = 2x jitter
    let e2e_latency = codec_delay_ms + avg_rtt / 2 + jitter_buffer_ms + frame_duration_ms;

    // Estimate quality
    let mos = estimate_mos(avg_rtt, jitter, config.simulated_loss_pct, codec_delay_ms);

    VoiceCallMetrics {
        encode_latency_us: avg_encode_us,
        decode_latency_us: avg_decode_us,
        network_rtt_ms: avg_rtt,
        e2e_latency_ms: e2e_latency,
        jitter_ms: jitter,
        packet_loss_pct: config.simulated_loss_pct,
        quality_score: mos,
        sample_count: config.frame_count as u64,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mos_estimation_good_conditions() {
        // Low latency, no loss
        let mos = estimate_mos(100, 10, 0.0, 5);
        assert!(
            mos > 4.0,
            "MOS should be > 4.0 for good conditions, got {}",
            mos
        );
    }

    #[test]
    fn test_mos_estimation_tor_conditions() {
        // Typical Tor: 500ms RTT, 50ms jitter, 5% loss
        let mos = estimate_mos(500, 50, 5.0, 5);
        assert!(
            mos > 1.5,
            "MOS should be > 1.5 for Tor conditions, got {}",
            mos
        );
        assert!(
            mos < 4.0,
            "MOS should be < 4.0 for Tor conditions, got {}",
            mos
        );
    }

    #[test]
    fn test_mos_estimation_bad_conditions() {
        // Very bad: 2000ms RTT, 200ms jitter, 30% loss
        let mos = estimate_mos(2000, 200, 30.0, 5);
        assert!(mos >= 1.0, "MOS should be >= 1.0, got {}", mos);
        assert!(
            mos < 2.5,
            "MOS should be < 2.5 for bad conditions, got {}",
            mos
        );
    }

    #[test]
    fn test_quality_thresholds_tor() {
        let thresholds = QualityThresholds::tor_standard();
        let good_metrics = VoiceCallMetrics {
            encode_latency_us: 100,
            decode_latency_us: 80,
            network_rtt_ms: 400,
            e2e_latency_ms: 350,
            jitter_ms: 50,
            packet_loss_pct: 3.0,
            quality_score: 3.0,
            sample_count: 100,
        };
        let assessment = thresholds.evaluate(&good_metrics);
        assert!(
            assessment.overall_pass,
            "Good metrics should pass Tor thresholds"
        );
    }

    #[test]
    fn test_quality_thresholds_fail() {
        let thresholds = QualityThresholds::strict();
        let bad_metrics = VoiceCallMetrics {
            encode_latency_us: 100,
            decode_latency_us: 80,
            network_rtt_ms: 1000,
            e2e_latency_ms: 800,
            jitter_ms: 150,
            packet_loss_pct: 15.0,
            quality_score: 1.5,
            sample_count: 100,
        };
        let assessment = thresholds.evaluate(&bad_metrics);
        assert!(
            !assessment.overall_pass,
            "Bad metrics should fail strict thresholds"
        );
        assert!(!assessment.latency_pass);
        assert!(!assessment.jitter_pass);
        assert!(!assessment.packet_loss_pass);
    }

    #[test]
    fn test_simulated_bench() {
        let config = BenchConfig {
            frame_count: 10,
            ..Default::default()
        };
        let metrics = run_simulated_bench(&config);
        assert_eq!(metrics.sample_count, 10);
        assert!(metrics.quality_score >= 1.0);
        assert!(metrics.quality_score <= 5.0);
        assert!(metrics.e2e_latency_ms > 0);
    }

    #[test]
    fn test_metrics_display() {
        let metrics = VoiceCallMetrics {
            encode_latency_us: 120,
            decode_latency_us: 90,
            network_rtt_ms: 500,
            e2e_latency_ms: 380,
            jitter_ms: 60,
            packet_loss_pct: 4.5,
            quality_score: 2.8,
            sample_count: 1000,
        };
        let display = format!("{}", metrics);
        assert!(display.contains("1000 samples"));
        assert!(display.contains("500 ms"));
    }
}
