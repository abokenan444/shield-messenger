//! Traffic Analysis Resistance: Padding, Fixed Packet Size, Cover Traffic, Random Delays.
//!
//! All protocol messages (PING, PONG, ACK, TEXT, etc.) are padded to a configurable
//! fixed payload size so that packet size does not leak message type or length.
//! Uses random padding, truncated-exponential delays, and optional cover traffic.
//!
//! Enhanced features:
//! - Constant 4096-byte packet sizes (configurable to 8192/16384)
//! - Adaptive cover traffic that mimics real messaging patterns
//! - Burst padding to mask typing indicators
//! - Traffic shaping with configurable profiles

use getrandom::getrandom;
use std::sync::atomic::{AtomicUsize, Ordering};
use thiserror::Error;

// ---------------------------------------------------------------------------
// Configurable fixed packet size
// ---------------------------------------------------------------------------

/// Runtime-configurable fixed packet size (atomic for lock-free reads).
/// Defaults to 4096. Change with `set_fixed_packet_size(8192)` before any I/O.
static RUNTIME_PACKET_SIZE: AtomicUsize = AtomicUsize::new(4096);

/// Default fixed packet payload size (compile-time).
pub const DEFAULT_PACKET_SIZE: usize = 4096;

/// Read the current fixed packet size (lock-free).
#[inline]
pub fn fixed_packet_size() -> usize {
    RUNTIME_PACKET_SIZE.load(Ordering::Relaxed)
}

/// Set the fixed packet size at runtime. Must be called before any padding I/O.
/// Valid values: 4096, 8192, 16384. Panics on invalid size.
pub fn set_fixed_packet_size(size: usize) {
    assert!(
        matches!(size, 4096 | 8192 | 16384),
        "FIXED_PACKET_SIZE must be 4096, 8192, or 16384 (got {})",
        size
    );
    RUNTIME_PACKET_SIZE.store(size, Ordering::Relaxed);
    log::info!("FIXED_PACKET_SIZE set to {} bytes", size);
}

/// Legacy constant (still exported for backward compat; prefer `fixed_packet_size()`).
pub const FIXED_PACKET_SIZE: usize = DEFAULT_PACKET_SIZE;

/// Max payload that fits in current fixed packet (runtime).
#[inline]
pub fn max_padded_payload() -> usize {
    fixed_packet_size() - PAYLOAD_LEN_FIELD
}

/// Legacy constant (compile-time default).
pub const MAX_PADDED_PAYLOAD: usize = DEFAULT_PACKET_SIZE - 2;

/// Length field: 2 bytes (BE) at start of padded buffer.
const PAYLOAD_LEN_FIELD: usize = 2;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[derive(Error, Debug)]
pub enum PaddingError {
    #[error("Payload too large for fixed packet (max {0} bytes)")]
    PayloadTooLarge(usize),
    #[error("Invalid padded payload (too short or wrong size)")]
    InvalidPaddedPayload,
    #[error("Burst padding error: {0}")]
    BurstError(String),
}

// ---------------------------------------------------------------------------
// Padding / unpadding
// ---------------------------------------------------------------------------

/// Pad `payload` to exactly `fixed_packet_size()`. Layout: [len:2 BE][payload][random_padding].
pub fn pad_to_fixed_size(payload: &[u8]) -> Result<Vec<u8>, PaddingError> {
    let pkt = fixed_packet_size();
    let max_payload = pkt
        .checked_sub(PAYLOAD_LEN_FIELD)
        .ok_or(PaddingError::InvalidPaddedPayload)?;
    if payload.len() > max_payload {
        return Err(PaddingError::PayloadTooLarge(max_payload));
    }
    let mut out = Vec::with_capacity(pkt);
    out.extend_from_slice(&(payload.len() as u16).to_be_bytes());
    out.extend_from_slice(payload);
    let padding_len = pkt - out.len();
    let mut pad = vec![0u8; padding_len];
    getrandom(&mut pad).map_err(|_| PaddingError::InvalidPaddedPayload)?;
    out.extend_from_slice(&pad);

    debug_assert_eq!(out.len(), pkt);
    Ok(out)
}

/// Strip padding from a received fixed-size payload. Accepts any valid fixed size (4096/8192/16384).
pub fn strip_padding(padded: &[u8]) -> Result<Vec<u8>, PaddingError> {
    let pkt = padded.len();
    if !matches!(pkt, 4096 | 8192 | 16384) || pkt < PAYLOAD_LEN_FIELD {
        return Err(PaddingError::InvalidPaddedPayload);
    }
    let len = u16::from_be_bytes(
        padded[0..PAYLOAD_LEN_FIELD]
            .try_into()
            .map_err(|_| PaddingError::InvalidPaddedPayload)?,
    ) as usize;
    if len > pkt - PAYLOAD_LEN_FIELD {
        return Err(PaddingError::InvalidPaddedPayload);
    }
    Ok(padded[PAYLOAD_LEN_FIELD..PAYLOAD_LEN_FIELD + len].to_vec())
}

// ---------------------------------------------------------------------------
// Random delays — truncated exponential distribution
// ---------------------------------------------------------------------------

/// Minimum delay (ms) for traffic analysis resistance.
const DELAY_MIN_MS: u64 = 200;
/// Maximum delay (ms).
const DELAY_MAX_MS: u64 = 800;
/// Lambda parameter for the exponential CDF (controls distribution shape).
/// Higher = more mass near DELAY_MIN_MS. 0.005 ≈ mean ~400 ms in [200,800].
const DELAY_LAMBDA: f64 = 0.005;

/// Random delay using truncated exponential distribution in [200, 800] ms.
/// Avoids the flat pattern of uniform distribution that could be fingerprinted.
#[cfg(feature = "std")]
pub fn random_traffic_delay_ms() -> u64 {
    let mut buf = [0u8; 4];
    if getrandom(&mut buf).is_err() {
        return 400;
    }
    let u = u32::from_ne_bytes(buf) as f64 / u32::MAX as f64; // uniform [0,1)
                                                              // Inverse CDF of truncated exponential on [min, max]:
                                                              //   x = min - ln(1 - u*(1 - exp(-lambda*(max-min)))) / lambda
    let range = (DELAY_MAX_MS - DELAY_MIN_MS) as f64;
    let exp_term = 1.0 - (-DELAY_LAMBDA * range).exp();
    let sample = DELAY_MIN_MS as f64 - (1.0 - u * exp_term).ln() / DELAY_LAMBDA;
    let clamped = sample.clamp(DELAY_MIN_MS as f64, DELAY_MAX_MS as f64);
    clamped as u64
}

/// Apply random traffic delay (blocking). Use before sending control messages.
#[cfg(feature = "std")]
pub fn apply_traffic_delay() {
    let ms = random_traffic_delay_ms();
    std::thread::sleep(std::time::Duration::from_millis(ms));
}

// ---------------------------------------------------------------------------
// Cover traffic
// ---------------------------------------------------------------------------

/// Cover traffic message type marker (0xFF — not a real protocol type).
pub const MSG_TYPE_COVER: u8 = 0xFF;

/// Generate a cover (dummy) packet — padded to fixed size, with random nonce payload.
/// Send periodically on idle connections to prevent timing analysis of silence gaps.
pub fn generate_cover_packet() -> Result<Vec<u8>, PaddingError> {
    let mut dummy = vec![MSG_TYPE_COVER];
    let mut nonce = [0u8; 24];
    getrandom(&mut nonce).map_err(|_| PaddingError::InvalidPaddedPayload)?;
    dummy.extend_from_slice(&nonce);
    pad_to_fixed_size(&dummy)
}

/// Returns true if the (unpadded) payload is a cover traffic packet to be silently discarded.
#[inline]
pub fn is_cover_packet(unpadded: &[u8]) -> bool {
    !unpadded.is_empty() && unpadded[0] == MSG_TYPE_COVER
}

/// Suggested cover traffic interval range (seconds).
/// Send one cover packet every [30, 90] seconds when idle.
pub const COVER_INTERVAL_MIN_SECS: u64 = 30;
pub const COVER_INTERVAL_MAX_SECS: u64 = 90;

/// Random cover traffic interval in [30, 90] seconds.
pub fn random_cover_interval_secs() -> u64 {
    let mut buf = [0u8; 1];
    if getrandom(&mut buf).is_err() {
        return 60;
    }
    COVER_INTERVAL_MIN_SECS
        + (buf[0] as u64 % (COVER_INTERVAL_MAX_SECS - COVER_INTERVAL_MIN_SECS + 1))
}

// ---------------------------------------------------------------------------
// Constant-time equality
// ---------------------------------------------------------------------------

/// Constant-time equality for two slices (for sensitive paths).
#[inline(always)]
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    bool::from(subtle::ConstantTimeEq::ct_eq(&diff, &0u8))
}

// ---------------------------------------------------------------------------
// Burst Padding — mask typing indicators and message bursts
// ---------------------------------------------------------------------------

/// Burst padding configuration.
///
/// When a user is typing, the app sends multiple small messages in quick succession.
/// An observer could detect this pattern. Burst padding sends additional cover
/// packets during and after typing to mask the real message boundaries.
#[derive(Clone, Debug, PartialEq)]
pub struct BurstPaddingConfig {
    /// Number of cover packets to send before the real message (pre-burst).
    pub pre_burst_count: u8,
    /// Number of cover packets to send after the real message (post-burst).
    pub post_burst_count: u8,
    /// Delay range between burst packets in milliseconds [min, max].
    pub inter_packet_delay_min_ms: u64,
    pub inter_packet_delay_max_ms: u64,
    /// Whether burst padding is enabled.
    pub enabled: bool,
}

impl Default for BurstPaddingConfig {
    fn default() -> Self {
        Self {
            pre_burst_count: 2,
            post_burst_count: 3,
            inter_packet_delay_min_ms: 50,
            inter_packet_delay_max_ms: 200,
            enabled: true,
        }
    }
}

/// Generate a burst of cover packets for sending around a real message.
///
/// Returns (pre_burst_packets, post_burst_packets) — each is a Vec of padded cover packets.
/// The caller should send pre_burst packets, then the real message, then post_burst packets,
/// with random delays between each.
pub fn generate_burst_padding(
    config: &BurstPaddingConfig,
) -> Result<(Vec<Vec<u8>>, Vec<Vec<u8>>), PaddingError> {
    if !config.enabled {
        return Ok((Vec::new(), Vec::new()));
    }

    let mut pre = Vec::with_capacity(config.pre_burst_count as usize);
    for _ in 0..config.pre_burst_count {
        pre.push(generate_cover_packet()?);
    }

    let mut post = Vec::with_capacity(config.post_burst_count as usize);
    for _ in 0..config.post_burst_count {
        post.push(generate_cover_packet()?);
    }

    Ok((pre, post))
}

/// Generate a random inter-packet delay for burst padding.
pub fn random_burst_delay_ms(config: &BurstPaddingConfig) -> u64 {
    let mut buf = [0u8; 2];
    if getrandom(&mut buf).is_err() {
        return (config.inter_packet_delay_min_ms + config.inter_packet_delay_max_ms) / 2;
    }
    let range = config.inter_packet_delay_max_ms - config.inter_packet_delay_min_ms;
    if range == 0 {
        return config.inter_packet_delay_min_ms;
    }
    let val = u16::from_ne_bytes(buf) as u64;
    config.inter_packet_delay_min_ms + (val % (range + 1))
}

// ---------------------------------------------------------------------------
// Traffic Shaping Profiles
// ---------------------------------------------------------------------------

/// Traffic shaping profile that defines how messages are sent to resist
/// traffic analysis. Different profiles trade off latency for privacy.
#[derive(Clone, Debug, PartialEq)]
pub enum TrafficProfile {
    /// Low latency, minimal padding. For users who prioritize speed.
    /// Cover traffic: every 90s, no burst padding, 200-400ms delays.
    LowLatency,
    /// Balanced privacy and performance (default).
    /// Cover traffic: every 30-90s, burst padding enabled, 200-800ms delays.
    Balanced,
    /// Maximum privacy. Constant-rate traffic with aggressive padding.
    /// Cover traffic: every 10-30s, burst padding with 5+5 packets, 400-1200ms delays.
    MaxPrivacy,
    /// Custom profile with user-defined parameters.
    Custom {
        cover_interval_min_secs: u64,
        cover_interval_max_secs: u64,
        delay_min_ms: u64,
        delay_max_ms: u64,
        burst_config: BurstPaddingConfig,
    },
}

impl TrafficProfile {
    /// Get the cover traffic interval range for this profile.
    pub fn cover_interval_range(&self) -> (u64, u64) {
        match self {
            TrafficProfile::LowLatency => (90, 120),
            TrafficProfile::Balanced => (COVER_INTERVAL_MIN_SECS, COVER_INTERVAL_MAX_SECS),
            TrafficProfile::MaxPrivacy => (10, 30),
            TrafficProfile::Custom {
                cover_interval_min_secs,
                cover_interval_max_secs,
                ..
            } => (*cover_interval_min_secs, *cover_interval_max_secs),
        }
    }

    /// Get the message delay range for this profile.
    pub fn delay_range_ms(&self) -> (u64, u64) {
        match self {
            TrafficProfile::LowLatency => (100, 300),
            TrafficProfile::Balanced => (DELAY_MIN_MS, DELAY_MAX_MS),
            TrafficProfile::MaxPrivacy => (400, 1200),
            TrafficProfile::Custom {
                delay_min_ms,
                delay_max_ms,
                ..
            } => (*delay_min_ms, *delay_max_ms),
        }
    }

    /// Get the burst padding configuration for this profile.
    pub fn burst_config(&self) -> BurstPaddingConfig {
        match self {
            TrafficProfile::LowLatency => BurstPaddingConfig {
                enabled: false,
                ..Default::default()
            },
            TrafficProfile::Balanced => BurstPaddingConfig::default(),
            TrafficProfile::MaxPrivacy => BurstPaddingConfig {
                pre_burst_count: 5,
                post_burst_count: 5,
                inter_packet_delay_min_ms: 100,
                inter_packet_delay_max_ms: 400,
                enabled: true,
            },
            TrafficProfile::Custom { burst_config, .. } => burst_config.clone(),
        }
    }

    /// Generate a random delay according to this profile's parameters.
    pub fn random_delay_ms(&self) -> u64 {
        let (min, max) = self.delay_range_ms();
        let mut buf = [0u8; 4];
        if getrandom(&mut buf).is_err() {
            return (min + max) / 2;
        }
        let u = u32::from_ne_bytes(buf) as f64 / u32::MAX as f64;
        let range = (max - min) as f64;
        let lambda = 0.005;
        let exp_term = 1.0 - (-lambda * range).exp();
        let sample = min as f64 - (1.0 - u * exp_term).ln() / lambda;
        sample.clamp(min as f64, max as f64) as u64
    }

    /// Generate a random cover traffic interval according to this profile.
    pub fn random_cover_interval_secs(&self) -> u64 {
        let (min, max) = self.cover_interval_range();
        let mut buf = [0u8; 2];
        if getrandom(&mut buf).is_err() {
            return (min + max) / 2;
        }
        let range = max - min;
        if range == 0 {
            return min;
        }
        let val = u16::from_ne_bytes(buf) as u64;
        min + (val % (range + 1))
    }
}

// ---------------------------------------------------------------------------
// Multi-packet fragmentation with uniform sizes
// ---------------------------------------------------------------------------

/// Fragment a large payload into multiple fixed-size packets.
///
/// For payloads that exceed `max_padded_payload()`, this function splits
/// them into multiple packets, each padded to `fixed_packet_size()`.
/// Each fragment includes a sequence number and total count header.
///
/// Layout per fragment: [len:2][seq:2][total:2][fragment_data][random_padding]
/// Total overhead per fragment: 6 bytes (len + seq + total).
pub fn fragment_and_pad(payload: &[u8]) -> Result<Vec<Vec<u8>>, PaddingError> {
    let pkt = fixed_packet_size();
    let _header_overhead = 6; // 2 (len) + 2 (seq) + 2 (total) — but len is already in pad_to_fixed_size
    let fragment_overhead = 4; // seq:2 + total:2 (inside the payload passed to pad_to_fixed_size)
    let max_fragment_data = pkt - PAYLOAD_LEN_FIELD - fragment_overhead;

    if payload.len() <= max_padded_payload() {
        // Single packet, no fragmentation needed
        return Ok(vec![pad_to_fixed_size(payload)?]);
    }

    let fragment_count = payload.len().div_ceil(max_fragment_data);
    if fragment_count > u16::MAX as usize {
        return Err(PaddingError::PayloadTooLarge(
            max_fragment_data * u16::MAX as usize,
        ));
    }

    let total = fragment_count as u16;
    let mut fragments = Vec::with_capacity(fragment_count);

    for (i, chunk) in payload.chunks(max_fragment_data).enumerate() {
        let seq = i as u16;
        let mut fragment_payload = Vec::with_capacity(fragment_overhead + chunk.len());
        fragment_payload.extend_from_slice(&seq.to_be_bytes());
        fragment_payload.extend_from_slice(&total.to_be_bytes());
        fragment_payload.extend_from_slice(chunk);
        fragments.push(pad_to_fixed_size(&fragment_payload)?);
    }

    Ok(fragments)
}

/// Reassemble fragments back into the original payload.
///
/// Expects fragments in order. Each fragment must be a valid padded packet
/// with the [seq:2][total:2] header after stripping padding.
pub fn reassemble_fragments(fragments: &[Vec<u8>]) -> Result<Vec<u8>, PaddingError> {
    if fragments.is_empty() {
        return Err(PaddingError::InvalidPaddedPayload);
    }

    // Check if this is a single non-fragmented packet
    let first_stripped = strip_padding(&fragments[0])?;
    if fragments.len() == 1 && first_stripped.len() >= 4 {
        let total = u16::from_be_bytes(
            first_stripped[2..4]
                .try_into()
                .map_err(|_| PaddingError::InvalidPaddedPayload)?,
        );
        if total <= 1 {
            // Could be a fragment with total=1, extract data after header
            if total == 1 {
                return Ok(first_stripped[4..].to_vec());
            }
            // Not a fragment at all
            return Ok(first_stripped);
        }
    }

    let mut result = Vec::new();
    for fragment in fragments {
        let stripped = strip_padding(fragment)?;
        if stripped.len() < 4 {
            return Err(PaddingError::InvalidPaddedPayload);
        }
        // Skip seq:2 and total:2 header
        result.extend_from_slice(&stripped[4..]);
    }

    Ok(result)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pad_strip_roundtrip() {
        let payload = b"hello";
        let padded = pad_to_fixed_size(payload).unwrap();
        assert_eq!(padded.len(), fixed_packet_size());
        let stripped = strip_padding(&padded).unwrap();
        assert_eq!(stripped.as_slice(), payload);
    }

    #[test]
    fn test_pad_rejects_too_large() {
        let big = vec![0u8; fixed_packet_size()];
        assert!(pad_to_fixed_size(&big).is_err());
    }

    #[test]
    fn test_strip_wrong_size() {
        let small = vec![0u8; 100];
        assert!(strip_padding(&small).is_err());
    }

    #[test]
    fn test_configurable_size() {
        set_fixed_packet_size(8192);
        let payload = vec![0u8; 5000];
        let padded = pad_to_fixed_size(&payload).unwrap();
        assert_eq!(padded.len(), 8192);
        let stripped = strip_padding(&padded).unwrap();
        assert_eq!(stripped.len(), 5000);
        set_fixed_packet_size(4096); // restore
    }

    #[test]
    fn test_cover_packet() {
        let cover = generate_cover_packet().unwrap();
        assert_eq!(cover.len(), fixed_packet_size());
        let unpadded = strip_padding(&cover).unwrap();
        assert!(is_cover_packet(&unpadded));
    }

    #[test]
    fn test_delay_distribution_range() {
        for _ in 0..100 {
            let d = random_traffic_delay_ms();
            assert!((200..=800).contains(&d), "delay {} out of range", d);
        }
    }

    #[test]
    fn test_cover_interval_range() {
        for _ in 0..50 {
            let s = random_cover_interval_secs();
            assert!((30..=90).contains(&s), "interval {} out of range", s);
        }
    }

    #[test]
    fn test_burst_padding_generation() {
        let config = BurstPaddingConfig::default();
        let (pre, post) = generate_burst_padding(&config).unwrap();
        assert_eq!(pre.len(), config.pre_burst_count as usize);
        assert_eq!(post.len(), config.post_burst_count as usize);

        // All packets should be cover packets
        for pkt in pre.iter().chain(post.iter()) {
            assert_eq!(pkt.len(), fixed_packet_size());
            let unpadded = strip_padding(pkt).unwrap();
            assert!(is_cover_packet(&unpadded));
        }
    }

    #[test]
    fn test_burst_padding_disabled() {
        let config = BurstPaddingConfig {
            enabled: false,
            ..Default::default()
        };
        let (pre, post) = generate_burst_padding(&config).unwrap();
        assert!(pre.is_empty());
        assert!(post.is_empty());
    }

    #[test]
    fn test_burst_delay_range() {
        let config = BurstPaddingConfig {
            inter_packet_delay_min_ms: 50,
            inter_packet_delay_max_ms: 200,
            ..Default::default()
        };
        for _ in 0..100 {
            let d = random_burst_delay_ms(&config);
            assert!((50..=200).contains(&d), "burst delay {} out of range", d);
        }
    }

    #[test]
    fn test_traffic_profile_low_latency() {
        let profile = TrafficProfile::LowLatency;
        assert_eq!(profile.cover_interval_range(), (90, 120));
        assert_eq!(profile.delay_range_ms(), (100, 300));
        assert!(!profile.burst_config().enabled);

        for _ in 0..50 {
            let d = profile.random_delay_ms();
            assert!(
                (100..=300).contains(&d),
                "low latency delay {} out of range",
                d
            );
        }
    }

    #[test]
    fn test_traffic_profile_max_privacy() {
        let profile = TrafficProfile::MaxPrivacy;
        assert_eq!(profile.cover_interval_range(), (10, 30));
        assert_eq!(profile.delay_range_ms(), (400, 1200));
        assert!(profile.burst_config().enabled);
        assert_eq!(profile.burst_config().pre_burst_count, 5);
    }

    #[test]
    fn test_traffic_profile_balanced() {
        let profile = TrafficProfile::Balanced;
        let config = profile.burst_config();
        assert!(config.enabled);
        assert_eq!(config.pre_burst_count, 2);
        assert_eq!(config.post_burst_count, 3);
    }

    #[test]
    fn test_traffic_profile_custom() {
        let profile = TrafficProfile::Custom {
            cover_interval_min_secs: 5,
            cover_interval_max_secs: 15,
            delay_min_ms: 50,
            delay_max_ms: 150,
            burst_config: BurstPaddingConfig {
                pre_burst_count: 1,
                post_burst_count: 1,
                inter_packet_delay_min_ms: 10,
                inter_packet_delay_max_ms: 50,
                enabled: true,
            },
        };
        assert_eq!(profile.cover_interval_range(), (5, 15));
        assert_eq!(profile.delay_range_ms(), (50, 150));
    }

    #[test]
    fn test_fragment_small_payload() {
        let payload = b"small message";
        let fragments = fragment_and_pad(payload).unwrap();
        assert_eq!(fragments.len(), 1);
        assert_eq!(fragments[0].len(), fixed_packet_size());
    }

    #[test]
    fn test_constant_time_eq() {
        let a = b"hello world";
        let b = b"hello world";
        let c = b"hello worlD";
        assert!(constant_time_eq(a, b));
        assert!(!constant_time_eq(a, c));
        assert!(!constant_time_eq(a, &a[..5]));
    }
}
