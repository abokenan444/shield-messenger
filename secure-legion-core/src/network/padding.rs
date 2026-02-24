//! Traffic Analysis Resistance: Padding and Fixed Packet Size
//!
//! All protocol messages (PING, PONG, ACK, TEXT, etc.) are padded to a fixed
//! payload size so that packet size does not leak message type or length.
//! Uses random padding; comparisons in this module are constant-time where applicable.

use getrandom::getrandom;
use thiserror::Error;

/// Default fixed packet payload size (bytes). All on-wire payloads are this size.
pub const FIXED_PACKET_SIZE: usize = 4096;

/// Max payload size that fits in a fixed packet (FIXED_PACKET_SIZE minus 2-byte length field).
/// Protocol invariant: PING, PONG, and ACK must be ≤ this size so they are always padded.
pub const MAX_PADDED_PAYLOAD: usize = FIXED_PACKET_SIZE - 2;

/// Length field: 2 bytes (BE) at start of padded buffer.
const PAYLOAD_LEN_FIELD: usize = 2;

#[derive(Error, Debug)]
pub enum PaddingError {
    #[error("Payload too large for fixed packet (max {0} bytes)")]
    PayloadTooLarge(usize),
    #[error("Invalid padded payload (too short)")]
    InvalidPaddedPayload,
}

/// Pad `payload` to exactly `FIXED_PACKET_SIZE`. Layout: [len:2 BE][payload][random_padding].
pub fn pad_to_fixed_size(payload: &[u8]) -> Result<Vec<u8>, PaddingError> {
    let max_payload = FIXED_PACKET_SIZE
        .checked_sub(PAYLOAD_LEN_FIELD)
        .ok_or(PaddingError::InvalidPaddedPayload)?;

    if payload.len() > max_payload {
        return Err(PaddingError::PayloadTooLarge(max_payload));
    }

    let mut out = Vec::with_capacity(FIXED_PACKET_SIZE);
    out.extend_from_slice(&(payload.len() as u16).to_be_bytes());
    out.extend_from_slice(payload);
    let padding_len = FIXED_PACKET_SIZE - out.len();
    let mut pad = vec![0u8; padding_len];
    getrandom(&mut pad).map_err(|_| PaddingError::InvalidPaddedPayload)?;
    out.extend_from_slice(&pad);

    debug_assert_eq!(out.len(), FIXED_PACKET_SIZE);
    Ok(out)
}

/// Strip padding from a received fixed-size payload. Layout: [len:2 BE][payload][random].
pub fn strip_padding(padded: &[u8]) -> Result<Vec<u8>, PaddingError> {
    if padded.len() != FIXED_PACKET_SIZE || padded.len() < PAYLOAD_LEN_FIELD {
        return Err(PaddingError::InvalidPaddedPayload);
    }
    let len = u16::from_be_bytes(
        padded[0..PAYLOAD_LEN_FIELD]
            .try_into()
            .map_err(|_| PaddingError::InvalidPaddedPayload)?,
    ) as usize;
    if len > FIXED_PACKET_SIZE - PAYLOAD_LEN_FIELD {
        return Err(PaddingError::InvalidPaddedPayload);
    }
    Ok(padded[PAYLOAD_LEN_FIELD..PAYLOAD_LEN_FIELD + len].to_vec())
}

/// Random delay for traffic analysis resistance: 200–800 ms.
/// Call before sending PING, PONG, or ACK to reduce timing correlation.
#[cfg(feature = "std")]
pub fn random_traffic_delay_ms() -> u64 {
    let mut buf = [0u8; 2];
    if getrandom(&mut buf).is_err() {
        return 400; // default mid-range
    }
    let t = u16::from_ne_bytes(buf);
    // 200 + (t % 601) => 200..=800
    200 + (t % 601) as u64
}

/// Apply random traffic delay (blocking). Use before sending control messages.
#[cfg(feature = "std")]
pub fn apply_traffic_delay() {
    let ms = random_traffic_delay_ms();
    std::thread::sleep(std::time::Duration::from_millis(ms));
}

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pad_strip_roundtrip() {
        let payload = b"hello";
        let padded = pad_to_fixed_size(payload).unwrap();
        assert_eq!(padded.len(), FIXED_PACKET_SIZE);
        let stripped = strip_padding(&padded).unwrap();
        assert_eq!(stripped.as_slice(), payload);
    }

    #[test]
    fn test_pad_rejects_too_large() {
        let big = vec![0u8; FIXED_PACKET_SIZE];
        assert!(pad_to_fixed_size(&big).is_err());
    }

    #[test]
    fn test_strip_wrong_size() {
        let small = vec![0u8; 100];
        assert!(strip_padding(&small).is_err());
    }
}
