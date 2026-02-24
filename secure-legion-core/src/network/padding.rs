//! Traffic Analysis Resistance: Padding, Fixed Packet Size, Cover Traffic, Random Delays.
//!
//! All protocol messages (PING, PONG, ACK, TEXT, etc.) are padded to a configurable
//! fixed payload size so that packet size does not leak message type or length.
//! Uses random padding, truncated-exponential delays, and optional cover traffic.

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
        "FIXED_PACKET_SIZE must be 4096, 8192, or 16384 (got {})", size
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
}

// ---------------------------------------------------------------------------
// Padding / unpadding
// ---------------------------------------------------------------------------

/// Pad `payload` to exactly `fixed_packet_size()`. Layout: [len:2 BE][payload][random_padding].
pub fn pad_to_fixed_size(payload: &[u8]) -> Result<Vec<u8>, PaddingError> {
    let pkt = fixed_packet_size();
    let max_payload = pkt.checked_sub(PAYLOAD_LEN_FIELD)
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
    COVER_INTERVAL_MIN_SECS + (buf[0] as u64 % (COVER_INTERVAL_MAX_SECS - COVER_INTERVAL_MIN_SECS + 1))
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
}
