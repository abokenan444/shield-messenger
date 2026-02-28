# Shield Protocol SDK

<p align="center">
  <strong>A post-quantum, metadata-zero, end-to-end encrypted messaging protocol.</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#examples">Examples</a> •
  <a href="#integration-guide">Integration Guide</a> •
  <a href="#security">Security</a>
</p>

---

## Why Shield Protocol?

Shield Protocol is a **standalone cryptographic protocol library** — similar to
how [Signal Protocol](https://signal.org/docs/) powers WhatsApp, Facebook
Messenger, and Skype. Any developer can integrate Shield Protocol into their own
application to gain military-grade, post-quantum secure messaging.

| Feature | Shield Protocol | Signal Protocol | Matrix/Olm |
|---------|:-:|:-:|:-:|
| Post-Quantum Key Agreement (ML-KEM-1024) | ✅ | ❌ | ❌ |
| Hybrid PQ Double Ratchet | ✅ | ❌ | ❌ |
| Traffic Analysis Resistance | ✅ | ❌ | ❌ |
| Zero-Knowledge Proofs | ✅ | ❌ | ❌ |
| CRDT Group Messaging | ✅ | ❌ | ✅ |
| Plausible Deniability (Duress PIN) | ✅ | ❌ | ❌ |
| Forward Secrecy | ✅ | ✅ | ✅ |
| Post-Compromise Security | ✅ | ✅ | ❌ |

## Quick Start

Add Shield Protocol to your `Cargo.toml`:

```toml
[dependencies]
shield-protocol = { path = "../shield-protocol" }
# Or when published to crates.io:
# shield-protocol = "0.1"
```

### Generate Keys & Encrypt

```rust
use shield_protocol::crypto::{generate_keypair, encrypt_message, decrypt_message};

// Generate an Ed25519 key pair
let (public_key, secret_key) = generate_keypair();

// Symmetric encryption (XChaCha20-Poly1305)
let key = [0x42u8; 32];
let ciphertext = encrypt_message(b"Hello, post-quantum world!", &key).unwrap();
let plaintext = decrypt_message(&ciphertext, &key).unwrap();
assert_eq!(plaintext, b"Hello, post-quantum world!");
```

### Post-Quantum Key Exchange

```rust
use shield_protocol::crypto::pqc::{
    generate_hybrid_keypair_random, hybrid_encapsulate, hybrid_decapsulate,
};

// Alice generates a hybrid (X25519 + ML-KEM-1024) keypair
let alice_kp = generate_hybrid_keypair_random();

// Bob encapsulates a shared secret to Alice
let (shared_secret, ciphertext) = hybrid_encapsulate(
    &alice_kp.x25519_public,
    &alice_kp.kyber_public,
).unwrap();

// Alice decapsulates
let recovered = hybrid_decapsulate(
    &ciphertext,
    &alice_kp.x25519_secret,
    &alice_kp.kyber_secret,
).unwrap();

assert_eq!(shared_secret, recovered);
```

### Post-Quantum Double Ratchet

```rust
use shield_protocol::crypto::pq_ratchet::PQRatchetState;

// Initialize from a shared secret (from hybrid KEM above)
let mut alice = PQRatchetState::from_hybrid_secret(
    &shared_secret, "alice.onion", "bob.onion"
).unwrap();

let mut bob = PQRatchetState::from_hybrid_secret(
    &shared_secret, "bob.onion", "alice.onion"
).unwrap();

// Alice encrypts
let encrypted = alice.encrypt(b"Quantum-safe message!").unwrap();

// Bob decrypts
let decrypted = bob.decrypt(&encrypted).unwrap();
assert_eq!(decrypted, b"Quantum-safe message!");
```

### Traffic Analysis Resistance

```rust
use shield_protocol::transport::padding::*;

// All messages padded to fixed size (prevents length analysis)
let padded = pad_to_fixed_size(b"secret message").unwrap();
assert_eq!(padded.len(), DEFAULT_PACKET_SIZE); // 4096 bytes

// Generate cover traffic (indistinguishable from real messages)
let cover = generate_cover_packet().unwrap();

// Add random delay before sending (prevents timing analysis)
let delay_ms = random_traffic_delay_ms(); // 200-800ms
```

### CRDT Group Messaging

```rust
use shield_protocol::crdt::{GroupState, DeviceID, GroupID};
use shield_protocol::crdt::ops::{OpEnvelope, OpType, GroupCreatePayload};

// Create a new group with operation-based CRDTs
let group_id = GroupID::random();
let device_id = DeviceID::random();

let mut state = GroupState::new();
// Apply operations to converge across devices...
```

## Architecture

```
shield-protocol/
├── src/
│   ├── lib.rs              # Public API entry point
│   ├── crypto/             # Cryptographic primitives
│   │   ├── encryption.rs   #   XChaCha20-Poly1305 + ratchet key evolution
│   │   ├── signing.rs      #   Ed25519 digital signatures
│   │   ├── key_exchange.rs #   X25519 Diffie-Hellman
│   │   ├── hashing.rs      #   Argon2id password hashing
│   │   ├── pqc.rs          #   Post-quantum crypto (ML-KEM-1024 hybrid)
│   │   ├── pq_ratchet.rs   #   PQ double ratchet (KEM + HMAC chains)
│   │   ├── constant_time.rs#   Constant-time comparisons (ct_eq! macro)
│   │   ├── replay_cache.rs #   LRU replay attack cache
│   │   ├── ack_state.rs    #   Two-phase commit for ratchet advancement
│   │   ├── zkproofs.rs     #   Bulletproof zero-knowledge range proofs
│   │   ├── backup.rs       #   Encrypted backup & social recovery (Shamir)
│   │   ├── deadman.rs      #   Dead man's switch
│   │   └── duress.rs       #   Duress PIN manager
│   ├── protocol/           # Wire format & data types
│   │   ├── message.rs      #   Message format & types
│   │   ├── contact.rs      #   Contact card format
│   │   └── security_mode.rs#   Security modes (standard/hardened/paranoid)
│   ├── transport/          # Transport-layer primitives
│   │   ├── padding.rs      #   Fixed-size padding, cover traffic, delays
│   │   └── packet.rs       #   Wire packet format with HMAC integrity
│   ├── storage/            # Storage contracts
│   │   └── mod.rs          #   DeniableStorage trait, duress PIN, decoys
│   └── crdt/               # Group messaging (feature-gated)
│       ├── ids.rs          #   DeviceID, GroupID, OpID
│       ├── ops.rs          #   Operation types, signing, verification
│       ├── membership.rs   #   OR-Set membership CRDT
│       ├── messages.rs     #   Message add/edit/delete/react
│       ├── metadata.rs     #   LWW registers (name, avatar, topic)
│       ├── limits.rs       #   Guardrail constants
│       └── apply.rs        #   Unified apply engine & state hash
└── Cargo.toml
```

## Cryptographic Primitives

| Component | Algorithm | Key Size |
|-----------|-----------|----------|
| **Message Encryption** | XChaCha20-Poly1305 | 256-bit |
| **Signatures** | Ed25519 | 256-bit |
| **Key Exchange** | X25519 ECDH | 256-bit |
| **Post-Quantum KEM** | ML-KEM-1024 (NIST FIPS 203) | 1568-byte public |
| **Hybrid KEM** | X25519 + ML-KEM-1024 | 64-byte shared secret |
| **Key Derivation** | HKDF-SHA256 | 256-bit |
| **Chain Ratchet** | HMAC-SHA256 | 256-bit |
| **Password Hashing** | Argon2id | Variable |
| **Replay Cache** | BLAKE3 + LRU | 10K entries |
| **Zero-Knowledge** | Bulletproofs (Ristretto) | Variable |
| **Packet Integrity** | HMAC-SHA256 | 256-bit |

## Integration Guide

### For App Developers

Shield Protocol is **transport-agnostic**. You bring the network layer; we
handle the cryptography and protocol state. Here's how to integrate:

1. **Key Management** — Use `crypto::generate_keypair()` and
   `crypto::pqc::generate_hybrid_keypair_random()` to create identity keys.
   Store them securely (e.g., Android Keystore, iOS Keychain).

2. **Session Setup** — Use `crypto::pqc::hybrid_encapsulate()` /
   `hybrid_decapsulate()` for initial key agreement, then create a
   `PQRatchetState` for ongoing message encryption.

3. **Message Encryption** — Call `ratchet.encrypt(plaintext)` to encrypt.
   The ratchet handles key evolution automatically.

4. **Packet Formatting** — Use `transport::padding::pad_to_fixed_size()` to
   pad messages to a fixed size before sending over the wire.

5. **Storage** — Implement the `DeniableStorage` and `ContactTrustStore`
   traits from `storage` for your platform's database.

6. **Groups** — Use the `crdt` module for conflict-free group operations
   that sync across devices without a central server.

### Platform Bindings

Shield Protocol is pure Rust and compiles to:

| Target | Use Case |
|--------|----------|
| `x86_64-unknown-linux-gnu` | Server / Desktop Linux |
| `aarch64-linux-android` | Android (via JNI) |
| `aarch64-apple-ios` | iOS (via C FFI) |
| `wasm32-unknown-unknown` | Web (via wasm-bindgen) |

```bash
# Build for your target
cargo build --release

# Build for WASM
cargo build --release --target wasm32-unknown-unknown --features wasm --no-default-features

# Run tests
cargo test
```

## Feature Flags

| Feature | Default | Description |
|---------|---------|-------------|
| `std` | ✅ | Standard library support |
| `groups` | ✅ | CRDT group messaging (adds `ciborium` for CBOR) |
| `wasm` | ❌ | WebAssembly support (`getrandom/js`) |

## Security

### Threat Model

Shield Protocol assumes:
- The network is adversarial (Tor-level threat model)
- Messages may be intercepted, reordered, or replayed
- Endpoints may be compromised after a session is established
- Quantum computers may break current asymmetric cryptography

### Defenses

| Threat | Defense |
|--------|---------|
| **Eavesdropping** | XChaCha20-Poly1305 authenticated encryption |
| **Quantum harvest** | ML-KEM-1024 hybrid KEM (NIST FIPS 203) |
| **Key compromise** | PQ double ratchet (forward secrecy + post-compromise security) |
| **Traffic analysis** | Fixed-size packets + cover traffic + random delays |
| **Replay attacks** | BLAKE3 replay cache (10K entries, LRU eviction) |
| **Timing attacks** | Constant-time comparisons (`ct_eq!` macro, `subtle` crate) |
| **Coercion** | Duress PIN → wipe real data, show plausible decoys |
| **Key loss** | Shamir secret sharing for social recovery |

### Audit Status

This library handles cryptographic operations. All code should be independently
audited before production use.

## Relationship to Shield Messenger

Shield Protocol is the standalone cryptographic engine extracted from
[Shield Messenger](https://shieldmessenger.com). Shield Messenger uses this SDK
plus app-layer components (Tor networking, voice calling, NLx402 payments,
platform FFI bindings) to provide a complete messaging application.

```
┌─────────────────────────────────────────┐
│          Shield Messenger App           │
│  ┌──────┐ ┌─────┐ ┌──────┐ ┌────────┐  │
│  │ FFI  │ │ Tor │ │Audio │ │NLx402  │  │
│  │(JNI/ │ │Mgr  │ │Opus  │ │Payment │  │
│  │ C/   │ │     │ │Codec │ │Protocol│  │
│  │WASM) │ │     │ │      │ │        │  │
│  └──┬───┘ └──┬──┘ └──────┘ └────────┘  │
│     │        │                          │
│  ┌──┴────────┴──────────────────────┐   │
│  │      shield-protocol (SDK)       │   │
│  │  ┌───────┐ ┌─────────┐ ┌──────┐ │   │
│  │  │Crypto │ │Transport│ │ CRDT │ │   │
│  │  │PQ KEM │ │Padding  │ │Groups│ │   │
│  │  │Ratchet│ │Packets  │ │      │ │   │
│  │  └───────┘ └─────────┘ └──────┘ │   │
│  │  ┌────────┐ ┌─────────────────┐  │   │
│  │  │Protocol│ │    Storage      │  │   │
│  │  │Messages│ │ Deniable Traits │  │   │
│  │  └────────┘ └─────────────────┘  │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## License

PolyForm Noncommercial License 1.0.0. See [LICENSE](../LICENSE) for full terms.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
