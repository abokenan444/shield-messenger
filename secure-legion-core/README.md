# Shield Messenger Core Library (Rust)

**Privacy-focused cryptography and messaging core for Shield Messenger**

This is the Rust core library that powers Shield Messenger's cryptographic operations, networking, and blockchain integration. It provides native bindings for Android (JNI), iOS (C FFI), and Web (WASM).

## Architecture

### Modules

1. **crypto/** - Cryptographic operations
   - `encryption.rs` - XChaCha20-Poly1305 encryption with ratchet key evolution
   - `signing.rs` - Ed25519 signatures
   - `key_exchange.rs` - X25519 Diffie-Hellman
   - `hashing.rs` - Argon2id password hashing
   - `pqc.rs` - Post-quantum cryptography (ML-KEM-1024 / Kyber)
   - `pq_ratchet.rs` - Post-quantum double ratchet (hybrid KEM + HMAC chains)
   - `constant_time.rs` - Constant-time comparisons (`ct_eq!` macro)
   - `replay_cache.rs` - LRU replay attack cache
   - `ack_state.rs` - Two-phase commit for ratchet advancement
   - `zkproofs.rs` - Bulletproof range proofs for ZK transfers

2. **network/** - Networking and protocol
   - `tor.rs` - Tor hidden service management and P2P messaging
   - `pingpong.rs` - Ping-Pong wake protocol
   - `padding.rs` - Traffic analysis resistance (fixed-size padding, cover traffic, delays)

3. **storage/** - Plausible deniability and Duress PIN
   - `mod.rs` - Deniable storage contract, Duress PIN, decoy database generator, stealth mode

4. **protocol/** - Data structures
   - `message.rs` - Message format and Ping-Pong tokens
   - `contact.rs` - Contact card format
   - `security_mode.rs` - Security modes and tiers

5. **securepay/** - Payment protocol
   - Zcash shielded transactions, Solana SPL tokens

6. **ffi/** - Foreign Function Interface
   - `android.rs` - JNI bindings for Android (Kotlin)
   - `ios.rs` - C FFI bindings for iOS (Swift)
   - `wasm.rs` - WASM bindings for Web (TypeScript)

## Security Features

| Feature | Module | Status |
|---------|--------|--------|
| **Post-Quantum Key Agreement** | `crypto/pqc.rs` | Implemented (X25519 + ML-KEM-1024) |
| **PQ Double Ratchet** | `crypto/pq_ratchet.rs` | Implemented (KEM steps + HMAC chains) |
| **Out-of-Order Messages** | `crypto/pq_ratchet.rs` | Implemented (skipped-key cache, 256 ahead) |
| **Post-Compromise Security** | `crypto/pq_ratchet.rs` | Implemented (KEM ratchet resets root) |
| **Forward Secrecy** | `crypto/encryption.rs` | Implemented (chain evolution + zeroize) |
| **Traffic Analysis Resistance** | `network/padding.rs` | Implemented (fixed size, delays, cover traffic) |
| **Constant-Time Comparisons** | `crypto/constant_time.rs` | Implemented (`ct_eq!` macro) |
| **Memory Hardening** | `crypto/encryption.rs` | Implemented (zeroize all keys after use) |
| **Duress PIN** | `storage/mod.rs` | Implemented (wipe + decoy DB + stealth) |
| **Replay Protection** | `crypto/replay_cache.rs` | Implemented (LRU 10K entries) |

## Building

### For Android

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android
cargo install cargo-ndk
./build_android.sh
```

### For iOS

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
./build_ios.sh
```

### For Web (WASM)

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
./build_wasm.sh
```

### Run Tests

```bash
cargo test                          # All tests
cargo test test_pq_ratchet          # PQ ratchet tests
cargo test test_pad_strip           # Padding tests
cargo test -- --nocapture           # With output
```

## Feature Flags

| Feature | Description | Default |
|---------|-------------|---------|
| `std` | Standard library support | Yes |
| `native` | Tokio + Opus + CBOR (desktop/mobile) | Yes |
| `android` | JNI bindings + Android logger | Via `native` |
| `ios` | C FFI bindings | Via `native` |
| `wasm` | WASM bindings + JS getrandom | No |
| `network` | HTTP client (reqwest) | No |
| `debug-logs` | Verbose logging | No |

## Cryptographic Primitives

| Component | Algorithm | Key Size |
|-----------|-----------|----------|
| **Message Encryption** | XChaCha20-Poly1305 | 256-bit |
| **Signatures** | Ed25519 | 256-bit |
| **Key Exchange** | X25519 ECDH | 256-bit |
| **Post-Quantum KEM** | ML-KEM-1024 (Kyber) | 1568-byte public |
| **Hybrid KEM** | X25519 + ML-KEM-1024 | 64-byte shared |
| **Key Derivation** | HKDF-SHA256 | 256-bit |
| **Chain Ratchet** | HMAC-SHA256 | 256-bit |
| **Password Hashing** | Argon2id | Variable |
| **Replay Cache** | BLAKE3 + LRU | 10K entries |

## Code Examples

### Post-Quantum Ratchet

```rust
use securelegion::crypto::pq_ratchet::PQRatchetState;
use securelegion::crypto::pqc::{generate_hybrid_keypair_from_seed, hybrid_encapsulate, hybrid_decapsulate};

// Initial key agreement (both sides)
let (shared_secret, ciphertext) = hybrid_encapsulate(&peer_x25519_pub, &peer_kyber_pub)?;
let mut ratchet = PQRatchetState::from_hybrid_secret(&shared_secret, "our.onion", "peer.onion")?;

// Encrypt (advances sending chain)
let encrypted = ratchet.encrypt(b"Hello, post-quantum world!")?;

// KEM ratchet step (post-compromise security)
let kem_ct = ratchet.kem_ratchet_send(&peer_x25519_pub, &peer_kyber_pub)?;
```

### Traffic Analysis Resistance

```rust
use securelegion::network::padding::*;

// Configure packet size for voice/video
set_fixed_packet_size(8192);

// Pad message to fixed size
let padded = pad_to_fixed_size(b"short message")?;
assert_eq!(padded.len(), 8192);

// Generate cover traffic packet
let cover = generate_cover_packet()?;

// Random delay before sending
let delay = random_traffic_delay_ms(); // Truncated exponential 200-800ms
```

### Duress PIN

```rust
use securelegion::storage::{on_duress_pin_entered, generate_decoy_data, DecoyConfig};

// On duress: clear core state
on_duress_pin_entered()?;

// Generate decoy data for the fake DB
let config = DecoyConfig { contact_count: 5, messages_per_contact: 20, ..Default::default() };
let decoy_contacts = generate_decoy_data(&config);
// App inserts decoy_contacts into new DB...
```

## Project Structure

```
secure-legion-core/
├── src/
│   ├── lib.rs                    # Main library entry + re-exports
│   ├── crypto/
│   │   ├── mod.rs
│   │   ├── encryption.rs         # XChaCha20-Poly1305 + ratchet
│   │   ├── signing.rs            # Ed25519
│   │   ├── key_exchange.rs       # X25519
│   │   ├── hashing.rs            # Argon2id
│   │   ├── pqc.rs                # ML-KEM-1024 (Kyber)
│   │   ├── pq_ratchet.rs         # PQ double ratchet + OOO
│   │   ├── constant_time.rs      # ct_eq! macro
│   │   ├── replay_cache.rs       # LRU replay cache
│   │   ├── ack_state.rs          # Two-phase commit
│   │   └── zkproofs.rs           # Bulletproof ZK proofs
│   ├── network/
│   │   ├── mod.rs
│   │   ├── tor.rs                # Tor hidden services
│   │   ├── pingpong.rs           # Wake protocol
│   │   └── padding.rs            # Padding + cover traffic + delays
│   ├── storage/
│   │   └── mod.rs                # Deniability + Duress + decoy
│   ├── protocol/
│   │   ├── message.rs            # Message format
│   │   ├── contact.rs            # Contact cards
│   │   └── security_mode.rs      # Security tiers
│   ├── securepay/                # Payment protocol
│   └── ffi/
│       ├── mod.rs
│       ├── android.rs            # JNI (Android)
│       ├── ios.rs                # C FFI (iOS)
│       └── wasm.rs               # WASM (Web)
├── deny.toml                     # cargo-deny config
├── Cargo.toml                    # Dependencies + features
├── build_android.sh              # Android build script
├── build_ios.sh                  # iOS build script
└── build_wasm.sh                 # WASM build script
```

## CI / Supply Chain Security

- **`cargo-audit`** — Checks for known vulnerabilities in dependencies.
- **`cargo-deny`** — Enforces license policy (MIT/Apache-2.0/BSD only) and dependency hygiene.
- **Docker** — `Dockerfile.core` for reproducible builds with pinned Rust version.
- **SHA256** — Release artifacts include checksums for verification.

See `.github/workflows/ci.yml` and `docs/nix-reproducible.md` for details.

## License

PolyForm Noncommercial License 1.0.0. See main project LICENSE for full terms.

## Contributing

See main repository [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

**Security Notice**: This library handles cryptographic operations. All code should be audited before production use. See [CHANGELOG-SECURITY.md](../CHANGELOG-SECURITY.md) for the full security changelog.
