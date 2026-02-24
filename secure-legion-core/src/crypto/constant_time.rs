//! Constant-time comparison for sensitive values (keys, nonces, tags).
//! Use for all comparisons that could leak through timing side channels.

use subtle::ConstantTimeEq;

/// Constant-time equality for 32-byte arrays (e.g. keys, public keys).
#[inline(always)]
pub fn eq_32(a: &[u8; 32], b: &[u8; 32]) -> bool {
    a.ct_eq(b).into()
}

/// Constant-time equality for 64-byte arrays (e.g. signatures).
#[inline(always)]
pub fn eq_64(a: &[u8; 64], b: &[u8; 64]) -> bool {
    a.ct_eq(b).into()
}

/// Constant-time equality for slices of the same length.
#[inline(always)]
pub fn eq_slices(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    bool::from(diff.ct_eq(&0u8))
}
