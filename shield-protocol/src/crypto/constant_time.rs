//! Constant-time comparison for sensitive values (keys, nonces, tags).
//! Use for all comparisons that could leak through timing side channels.
//!
//! Prefer the `ct_eq!` macro for concise usage:
//! ```ignore
//! if ct_eq!(their_pubkey, our_pubkey) { ... }
//! ```

use subtle::ConstantTimeEq;

/// Convenience macro for constant-time equality on any two byte expressions.
/// Works with `[u8; N]`, `&[u8; N]`, `&[u8]`, `Vec<u8>`.
///
/// ```ignore
/// use crate::crypto::ct_eq;
/// let a = [1u8; 32];
/// let b = [1u8; 32];
/// assert!(ct_eq!(a, b));
/// ```
#[macro_export]
macro_rules! ct_eq {
    ($a:expr, $b:expr) => {
        $crate::crypto::constant_time::eq_slices($a.as_ref(), $b.as_ref())
    };
}

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

/// Constant-time equality for 24-byte arrays (e.g. nonces).
#[inline(always)]
pub fn eq_24(a: &[u8; 24], b: &[u8; 24]) -> bool {
    a.ct_eq(b).into()
}

/// Constant-time equality for slices of the same length.
/// Returns false immediately (non-secret) if lengths differ.
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_eq_32_same() {
        let a = [42u8; 32];
        assert!(eq_32(&a, &a));
    }

    #[test]
    fn test_eq_32_diff() {
        let a = [1u8; 32];
        let b = [2u8; 32];
        assert!(!eq_32(&a, &b));
    }

    #[test]
    fn test_eq_slices_same() {
        let a = vec![0xABu8; 100];
        assert!(eq_slices(&a, &a));
    }

    #[test]
    fn test_eq_slices_diff_len() {
        assert!(!eq_slices(&[1, 2, 3], &[1, 2]));
    }

    #[test]
    fn test_ct_eq_macro() {
        let a = [7u8; 32];
        let b = [7u8; 32];
        assert!(ct_eq!(a, b));
        let c = [8u8; 32];
        assert!(!ct_eq!(a, c));
    }
}
