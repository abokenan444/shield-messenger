## PR #5: Comprehensive Security Enhancements (Tasks 3–9)

This PR completes the remaining 7 enhancement tasks from the security audit, adding **4,139 new lines** across **20 files** (10 new files, 10 modified).

---

### Task 3: Tor Hidden Service DoS Protection

**New files:**
- `secure-legion-core/src/network/tor_dos_protection.rs` — Application-level DoS protection with 5 defense layers:
  1. Connection rate limiting (global + per-circuit)
  2. Concurrent connection cap
  3. Proof-of-Work challenge (SHA3-256) under high load
  4. Circuit-level throttling with violation tracking
  5. Automatic blacklisting with configurable ban duration
- `docs/TOR_DOS_PROTECTION.md` — Deployment guide with `torrc` configuration generator and `iptables` rules generator

### Task 4: Arti Integration Enhancement

**Modified:** `secure-legion-core/src/network/arti.rs`
- Integrated DoS protection into `ArtiTorManager`
- Added circuit health monitoring with scoring (latency, failure rate, age)
- Added vanguard support configuration
- Added ephemeral onion service management
- Added automatic circuit rotation based on health scores

### Task 5: Network Padding Enhancement

**Modified:** `secure-legion-core/src/network/padding.rs`
- Added `BurstPaddingConfig` for configurable burst padding (pre/post message)
- Added `TrafficProfile` enum (Chat, VoiceCall, FileTransfer, Stealth) with per-profile padding parameters
- Added `fragment_and_pad()` / `reassemble_fragments()` for large payload handling
- Added `constant_time_eq()` utility for timing-safe comparisons

### Task 6: Extended Fuzzing Targets

**New files:**
- `fuzz/fuzz_targets/fuzz_ratchet.rs` — PQ Double Ratchet fuzzing (init, encrypt/decrypt, out-of-order, state export/import)
- `fuzz/fuzz_targets/fuzz_padding.rs` — Padding round-trip, cover packets, fragmentation, burst padding
- `fuzz/fuzz_targets/fuzz_dos_protection.rs` — PoW verification, torrc/iptables generation

Total fuzz targets: **3 existing + 3 new = 6** (plus 3 from PR #4 = **9 total**)

### Task 7: Android Architecture Documentation

**New file:** `docs/ANDROID_ARCHITECTURE.md`
- Inventoried all **54 Activities** grouped by domain (Auth, Messaging, Voice, Contacts, Wallet, Settings, Security)
- Proposed Single-Activity Architecture with Jetpack Navigation
- 4-phase migration plan with effort estimates (7–10 weeks)
- Security considerations (FLAG_SECURE, auto-lock, duress PIN, back stack clearing)
- Before/after comparison table (memory, navigation, testing)

### Task 8: Voice Call Testing

**New file:** `secure-legion-core/src/audio/voice_latency_bench.rs`
- ITU-T G.107 E-model MOS estimation adapted for Opus over Tor
- `QualityThresholds` with Tor-standard and strict presets
- `BenchConfig` with Tor-optimized defaults (24kbps Opus, 300–800ms RTT)
- Simulated benchmarking (codec timing + network simulation)
- 5 unit tests covering good/bad/Tor conditions

### Task 9: Plausible Deniability (Duress PIN — Rust Core)

**New file:** `secure-legion-core/src/crypto/duress.rs`
- `DuressManager` with Argon2id PIN hashing (indistinguishable from real PIN)
- Constant-time PIN comparison (checks both real and duress PINs every time)
- Configurable `WipeActions` (keys, messages, contacts, wallet, call history, secure overwrite)
- `DecoyProfile` for post-wipe plausible state
- Silent distress alert to trusted contact
- Export/import for configuration persistence
- 10 unit tests covering all scenarios
- Integrates with existing `DuressPinActivity.kt` and `storage::on_duress_pin_entered()`

---

### Files Changed Summary

| Category | File | Status |
|----------|------|--------|
| **Tor DoS** | `src/network/tor_dos_protection.rs` | New |
| **Tor DoS** | `docs/TOR_DOS_PROTECTION.md` | New |
| **Arti** | `src/network/arti.rs` | Modified |
| **Padding** | `src/network/padding.rs` | Modified |
| **Padding** | `src/network/mod.rs` | Modified |
| **Fuzzing** | `fuzz/fuzz_targets/fuzz_ratchet.rs` | New |
| **Fuzzing** | `fuzz/fuzz_targets/fuzz_padding.rs` | New |
| **Fuzzing** | `fuzz/fuzz_targets/fuzz_dos_protection.rs` | New |
| **Fuzzing** | `fuzz/Cargo.toml` | Modified |
| **Android** | `docs/ANDROID_ARCHITECTURE.md` | New |
| **Voice** | `src/audio/voice_latency_bench.rs` | New |
| **Voice** | `src/audio/mod.rs` | Modified |
| **Duress** | `src/crypto/duress.rs` | New |
| **Duress** | `src/crypto/mod.rs` | Modified |
| **Web** | `web/src/components/IdentityKeyChangeBanner.tsx` | New |
| **Web** | `web/src/components/ChatView.tsx` | Modified |
| **Web** | `web/src/lib/i18n/locales.ts` | Modified |
| **Web** | `web/src/lib/store/contactStore.ts` | Modified |
| **CI** | `.github/workflows/reproducible.yml` | New |
| **Docs** | `docs/REPRODUCIBLE_BUILDS.md` | Modified |

### Dependencies

All new code uses **only existing Cargo.toml dependencies** — no new crates added:
- `argon2 0.5`, `sha3 0.10`, `subtle 2.5`, `zeroize 1.7`, `getrandom 0.2`
- `rand 0.8`, `tokio 1.35`, `serde 1.0`, `thiserror 1.0`, `base64 0.21`

### Testing

- `duress.rs`: 10 unit tests
- `voice_latency_bench.rs`: 5 unit tests
- 3 new fuzz targets with `arbitrary` derive
- All existing tests unaffected
