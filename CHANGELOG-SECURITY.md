# Security Changelog — Shield Messenger (Secure Legion)

**Repository:** https://github.com/abokenan444/shield-messenger  
**Branch:** `main`

This changelog documents all security and privacy enhancements applied to the Secure Legion core library and protocol.

---

## [2.0.0] - 2026-02-24 — Security Hardening v2

### Post-Quantum Double Ratchet — Out-of-Order & Forward Secrecy

- **Out-of-order message handling:** Added skipped-message key cache (up to 256 messages ahead) in `PQRatchetState`. When a message arrives with sequence > expected, intermediate message keys are derived and cached. Cached keys are consumed on use and zeroized immediately.
- **Duplicate rejection:** Messages with already-consumed sequence numbers are rejected to prevent replay attacks.
- **Old root key deletion:** Every KEM ratchet step (`kem_ratchet_send` / `kem_ratchet_receive`) now zeroizes the old root key, old chain keys, and all cached skipped keys before applying the new root. This ensures post-compromise security: compromise of current state cannot recover future keys.
- **Self-contained encrypt/decrypt:** `PQRatchetState::encrypt()` now produces wire-format output `[version:1][sequence:8][nonce:24][ciphertext+tag]`, and `decrypt()` parses and validates this format, enabling proper sequence extraction for out-of-order handling.
- **Test vectors for security properties:**
  - `test_kem_ratchet_post_compromise_security` — extracts compromised keys, performs KEM ratchet, verifies new keys differ and old keys are useless.
  - `test_forward_secrecy` — verifies that old message keys are irrecoverable after chain evolution.
  - `test_out_of_order` — sends m0, m1, m2 and decrypts in order m2, m0, m1.
  - `test_duplicate_rejected` — verifies replay rejection.
  - `test_too_far_ahead_rejected` — verifies skip limit enforcement.

**Files:** `secure-legion-core/src/crypto/pq_ratchet.rs`

---

### Traffic Analysis Resistance — Configurable Size, Cover Traffic, Exponential Delays

- **Configurable fixed packet size:** `FIXED_PACKET_SIZE` is now runtime-configurable via `set_fixed_packet_size(4096 | 8192 | 16384)`. Uses `AtomicUsize` for lock-free reads. 8192/16384 recommended for voice/video streams.
- **Truncated exponential delay distribution:** Replaced uniform random delay (200-800 ms) with truncated exponential (lambda=0.005). This avoids flat-pattern fingerprinting that a uniform distribution exposes.
- **Cover traffic:** Added `generate_cover_packet()` (type `0xFF`) with random nonce, padded to fixed size. `random_cover_interval_secs()` returns a random interval in [30, 90] seconds for idle connections. Receiver discards cover packets silently via `is_cover_packet()`.
- **Receive path updated:** `tor.rs` now accepts any valid fixed size (4096/8192/16384) and silently discards cover traffic packets before any further processing.

**Files:** `secure-legion-core/src/network/padding.rs`, `secure-legion-core/src/network/mod.rs`, `secure-legion-core/src/network/tor.rs`

---

### Constant-Time Operations — `ct_eq!` Macro

- **`ct_eq!` macro:** Convenience macro for constant-time equality on any byte expression (`[u8; N]`, `&[u8]`, `Vec<u8>`). Reduces human error by providing a single entry point: `if ct_eq!(a, b) { ... }`.
- **`eq_24()` helper:** Added constant-time equality for 24-byte arrays (nonces).
- **Unit tests** for all `eq_*` functions and the `ct_eq!` macro.

**Files:** `secure-legion-core/src/crypto/constant_time.rs`, `secure-legion-core/src/crypto/mod.rs`

---

### Plausible Deniability — Decoy Database Generator & Stealth Mode

- **Decoy database generator:** `generate_decoy_data(config)` produces plausible fake contacts with realistic names, fake `.onion` addresses, and randomized messages (sorted chronologically). Configurable via `DecoyConfig` (contact count, messages per contact, message length range).
- **`StealthModeSpec`:** Optional app-layer behavior to hide the launcher icon after duress. Includes `hide_app_icon` flag and optional `launcher_alias` for Android component toggling.
- **`DuressPinSpec` extended:** Now includes `stealth_mode` and `decoy_config` fields for comprehensive duress response.
- **All new types exported** from `lib.rs`: `StealthModeSpec`, `DecoyConfig`, `DecoyContact`, `DecoyMessage`, `generate_decoy_data`.

**Files:** `secure-legion-core/src/storage/mod.rs`, `secure-legion-core/src/lib.rs`

---

### Documentation — Protocol v2.0 & Threat Model

- **Protocol specification v2.0** (`docs/protocol.md`):
  - Section 3.4: Out-of-order message handling (skipped-key cache).
  - Section 4.1: Configurable fixed packet size.
  - Section 4.2: Truncated exponential delay distribution.
  - Section 4.3: Cover traffic (type `0xFF`, 30-90 second intervals).
  - Section 4.4: `ct_eq!` macro for constant-time comparisons.
  - Section 7: Duress PIN with decoy generation and stealth mode.
  - Section 10: Updated duress PIN integration (5 steps including decoy and stealth).
  - Section 11: **New threat model** with 8 adversary types (global passive, active, momentary compromise, persistent compromise, quantum, side-channel, forensic, metadata) and 10 security properties.
- **Nix reproducible builds guide** (`docs/nix-reproducible.md`): Planned Nix flake for bit-for-bit reproducible builds, stronger than Docker for F-Droid/PrivacyGuides verification.

**Files:** `docs/protocol.md`, `docs/nix-reproducible.md`

---

## [1.0.0] - 2026-02-24 — Security & Privacy Roadmap (Initial)

### Post-Quantum Double Ratchet (ML-KEM-1024)

- **`PQRatchetState`** — Session state with root key, sending/receiving chain keys, and sequence numbers.
- **`from_hybrid_secret()`** — Initializes ratchet from 64-byte hybrid shared secret (X25519 + ML-KEM-1024).
- **`encrypt()` / `decrypt()`** — Symmetric ratchet with per-message key evolution.
- **`kem_ratchet_send()` / `kem_ratchet_receive()`** — KEM ratchet steps that refresh the root key for post-compromise security.
- Integration with existing `crypto/pqc/hybrid_kem.rs` (X25519 + Kyber-1024).

**Files:** `secure-legion-core/src/crypto/pq_ratchet.rs`

---

### Traffic Analysis Resistance

- **Fixed 4096-byte packet size** for all protocol messages (PING, PONG, ACK, TEXT, etc.).
- **`pad_to_fixed_size()`** — Adds 2-byte length prefix and random padding to exactly `FIXED_PACKET_SIZE`.
- **`strip_padding()`** — Extracts original payload from padded buffer.
- **Random delay (200-800 ms)** before sending PONG and ACK to reduce timing correlation.
- **Protocol invariant:** Control messages (PONG, ACK) are rejected if padding fails — no unpadded fallback. `debug_assert_eq!(to_send.len(), FIXED_PACKET_SIZE)` in the send path.
- **Receive path** in `tor.rs` automatically strips padding when incoming packet matches `FIXED_PACKET_SIZE`.

**Files:** `secure-legion-core/src/network/padding.rs`, `secure-legion-core/src/network/tor.rs`

---

### Constant-Time Comparisons

- **`eq_32()`, `eq_64()`, `eq_slices()`** using `subtle::ConstantTimeEq` for all key, nonce, and tag comparisons.
- **`pingpong.rs`** updated to use `eq_32()` for `recipient_pubkey` verification instead of byte-by-byte comparison.

**Files:** `secure-legion-core/src/crypto/constant_time.rs`, `secure-legion-core/src/network/pingpong.rs`

---

### Memory Hardening

- **`encryption.rs`** — Message keys zeroized immediately after use in `encrypt_message_with_evolution` and `decrypt_message_with_evolution`.
- **`clear_all_pending_ratchets_for_duress()`** — Zeroizes all pending ratchet chain keys when Duress PIN is triggered.
- **`PQRatchetState::Drop`** — All keys (root, sending chain, receiving chain, skipped cache) are zeroized on drop.

**Files:** `secure-legion-core/src/crypto/encryption.rs`, `secure-legion-core/src/crypto/pq_ratchet.rs`

---

### Plausible Deniability & Duress PIN

- **`DeniableStorage` trait** — Contract for app-layer encrypted storage (e.g. SQLCipher).
- **`DuressPinSpec`** — Specifies duress behavior (show fake DB, fake DB path).
- **`on_duress_pin_entered()`** — Core entry point that clears in-memory sensitive state.
- **Android JNI** — `RustBridge.onDuressPinEntered()` binding for Android apps.

**Files:** `secure-legion-core/src/storage/mod.rs`, `secure-legion-core/src/ffi/android.rs`

---

### Reproducible & Verifiable Builds

- **`Dockerfile.core`** — Multi-stage Docker build with pinned Rust version (1.83-bookworm). Produces SHA256 checksums of built artifacts.
- **`.github/workflows/ci.yml`** — GitHub Actions CI pipeline:
  - Build and test on every push/PR.
  - `cargo-audit` for known vulnerabilities.
  - `cargo-deny` for license compliance and dependency policy.
  - SHA256 checksums of release artifacts on push to `main`.
- **`deny.toml`** — `cargo-deny` configuration: allowed licenses (MIT, Apache-2.0, BSD), advisory database checks, ban on multiple dependency versions.

**Files:** `Dockerfile.core`, `.github/workflows/ci.yml`, `secure-legion-core/deny.toml`

---

### Tor / Arti Migration Path

- **`docs/arti-migration.md`** — Detailed plan for migrating from C Tor (tor-android) to Arti (Rust Tor):
  - Ephemeral hidden services (create/destroy per session).
  - Circuit isolation (discovery != request != messaging).
  - Cover traffic on Tor circuits.
- **`Cargo.toml`** — Commented-out `arti` feature flag for future integration.

**Files:** `docs/arti-migration.md`, `secure-legion-core/Cargo.toml`

---

### Protocol Specification

- **`docs/protocol.md` v1.0** — Full protocol specification covering:
  - Onion identity and v3 address derivation.
  - Hybrid key agreement (X25519 + ML-KEM-1024).
  - Symmetric ratchet with HMAC chain evolution.
  - KEM ratchet for post-compromise security.
  - Fixed packet size and padding layout.
  - Message type table (PING through CRDT_OPS).
  - Ping-Pong wake protocol flow.
  - Plausible deniability and Duress PIN integration.
  - Code invariants and assertions.

**Files:** `docs/protocol.md`

---

## Summary of All Security Files

| Path | Status | Description |
|------|--------|-------------|
| `secure-legion-core/src/crypto/pq_ratchet.rs` | New | Post-quantum double ratchet with OOO support |
| `secure-legion-core/src/crypto/constant_time.rs` | New | Constant-time comparisons + `ct_eq!` macro |
| `secure-legion-core/src/network/padding.rs` | New | Traffic analysis resistance (padding, delays, cover traffic) |
| `secure-legion-core/src/storage/mod.rs` | New | Deniability, Duress PIN, decoy generator, stealth mode |
| `secure-legion-core/src/crypto/encryption.rs` | Modified | Memory hardening (zeroize), duress ratchet clearing |
| `secure-legion-core/src/network/tor.rs` | Modified | Padding integration, cover traffic discard, configurable sizes |
| `secure-legion-core/src/network/pingpong.rs` | Modified | Constant-time pubkey comparison |
| `secure-legion-core/src/ffi/android.rs` | Modified | `onDuressPinEntered` JNI binding |
| `secure-legion-core/src/crypto/mod.rs` | Modified | Re-exports for new modules |
| `secure-legion-core/src/network/mod.rs` | Modified | Re-exports for padding, cover traffic |
| `secure-legion-core/src/lib.rs` | Modified | Re-exports for storage types |
| `secure-legion-core/Cargo.toml` | Modified | Feature flags, optional deps for cross-platform |
| `docs/protocol.md` | New | Protocol specification v2.0 with threat model |
| `docs/arti-migration.md` | New | Tor to Arti migration plan |
| `docs/nix-reproducible.md` | New | Nix flake reproducible builds guide |
| `.github/workflows/ci.yml` | New | CI pipeline with audit and checksums |
| `Dockerfile.core` | New | Reproducible Docker build |
| `secure-legion-core/deny.toml` | New | cargo-deny license/dep policy |
