# Shield Messenger — Technical Whitepaper

**Version 1.0 — June 2025**

---

## Abstract

Shield Messenger is a multi-platform, serverless, end-to-end encrypted communication system designed to eliminate metadata collection, resist quantum computing threats, and integrate privacy-preserving payments. This whitepaper describes the cryptographic architecture, network protocol, threat model, and system design that distinguish Shield Messenger from existing secure messaging solutions.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Design Principles](#2-design-principles)
3. [Cryptographic Architecture](#3-cryptographic-architecture)
4. [Network Architecture](#4-network-architecture)
5. [Shield Messenger Protocol](#5-shield-messenger-protocol)
6. [Key Management](#6-key-management)
7. [Secure Pay Protocol](#7-secure-pay-protocol)
8. [Threat Model](#8-threat-model)
9. [Implementation](#9-implementation)
10. [Comparison with Existing Solutions](#10-comparison-with-existing-solutions)
11. [Future Work](#11-future-work)
12. [References](#12-references)

---

## 1. Introduction

Modern encrypted messaging applications (Signal, WhatsApp, Telegram) rely on centralized server infrastructure that creates inherent privacy risks. Even with end-to-end encryption, centralized servers collect metadata: who communicates with whom, when, how often, and from where. This metadata has been proven to be as revealing as message content itself [[1]](#references).

Shield Messenger eliminates this risk through a fundamentally different architecture: **direct peer-to-peer communication over Tor hidden services**, with no central servers mediating connections. Messages travel directly from sender to recipient through the Tor network, leaving no metadata trail on any server.

Additionally, Shield Messenger addresses the emerging quantum computing threat by implementing **hybrid post-quantum key exchange** using ML-KEM-1024 (NIST FIPS 203) alongside classical X25519, ensuring that intercepted traffic cannot be decrypted by future quantum computers.

---

## 2. Design Principles

### 2.1 Zero-Knowledge Architecture

- No servers store messages, contacts, or metadata
- No central entity can comply with data requests (there is nothing to hand over)
- All cryptographic operations occur exclusively on the user's device

### 2.2 Defense in Depth

- Multiple independent layers of encryption and authentication
- Hardware-backed key storage (Android StrongBox / Secure Enclave)
- Separate Tor hidden services for different functions (discovery, friend requests, messaging)

### 2.3 Post-Quantum Readiness

- Hybrid classical + post-quantum key exchange
- Designed for algorithm agility (swappable KEM implementations)
- Forward secrecy through per-message key ratcheting

### 2.4 Metadata Resistance

- Communication via Tor hidden services (no IP addresses exposed)
- No centralized contact directory
- Friend discovery via ephemeral QR codes / short codes

### 2.5 Usability

- Despite deep cryptographic underpinnings, the user experience is designed to be straightforward
- All crypto operations are transparent to the user
- Biometric authentication for device unlock

---

## 3. Cryptographic Architecture

### 3.1 Primitives

| Primitive | Algorithm | Standard | Purpose |
|-----------|-----------|----------|---------|
| Symmetric Encryption | XChaCha20-Poly1305 | IETF RFC 8439 | Message & voice encryption |
| Digital Signatures | Ed25519 | FIPS 186-5 | Sender authentication |
| Key Agreement | X25519 ECDH | RFC 7748 | Classical session key exchange |
| Post-Quantum KEM | ML-KEM-1024 | NIST FIPS 203 | Quantum-resistant key encapsulation |
| Key Derivation | HKDF-SHA256 | RFC 5869 | Deriving symmetric keys from shared secrets |
| Password Hashing | Argon2id | RFC 9106 | PIN/password derivation |
| Database Encryption | AES-256-GCM (SQLCipher) | NIST SP 800-38D | Local data encryption |

### 3.2 Hybrid Post-Quantum Key Exchange

Shield Messenger implements a hybrid key exchange that combines the proven security of X25519 with the quantum resistance of ML-KEM-1024:

```
shared_secret = HKDF-SHA256(
    ikm = X25519_shared_secret || ML-KEM-1024_shared_secret,
    salt = transcript_hash,
    info = "shield-messenger-hybrid-kex-v1"
)
```

This hybrid approach ensures that:
1. If ML-KEM-1024 is broken, X25519 still provides security
2. If X25519 is broken by quantum computers, ML-KEM-1024 provides security
3. An attacker must break BOTH algorithms simultaneously to compromise the key exchange

### 3.3 Forward Secrecy

Per-message forward secrecy is achieved through an HMAC-based symmetric key ratchet:

```
chain_key[n+1] = HMAC-SHA256(chain_key[n], 0x01)
message_key[n] = HMAC-SHA256(chain_key[n], 0x02)
```

Each message key is derived from the chain key and immediately discarded after use. Compromising a single message key does not reveal any other message keys. The chain ratchets independently in both directions (sending and receiving).

### 3.4 Message Encryption

Each message is encrypted as follows:

```
1. Derive message_key from current chain_key
2. Generate 24-byte random nonce
3. Serialize plaintext with protobuf
4. ciphertext = XChaCha20-Poly1305.Encrypt(
       key = message_key,
       nonce = nonce,
       plaintext = serialized_message,
       aad = sender_identity || recipient_identity || timestamp
   )
5. Sign(Ed25519, sender_private_key, ciphertext || nonce)
6. Ratchet chain_key forward
```

---

## 4. Network Architecture

### 4.1 Tor Hidden Services

Each Shield Messenger user operates **three independent Tor hidden services**:

| Service | Port | Purpose |
|---------|------|---------|
| **Discovery** | Dynamic | Shareable address for friend discovery (QR code / short code) |
| **Friend Request** | 9151 | Receives PIN-encrypted friend request proposals |
| **Messaging** | 9150 | Receives end-to-end encrypted messages and calls |

This separation ensures that:
- Compromising the discovery service does not reveal the messaging service address
- Friend requests and messages travel through independent circuits
- Each service can be independently rotated without disrupting the others

### 4.2 Peer-to-Peer Topology

```
┌──────────┐                                    ┌──────────┐
│  User A  │                                    │  User B  │
│ Device   │                                    │ Device   │
│          │                                    │          │
│ HS: abc  ├──── Tor Circuit 1 ────────────────►│ HS: xyz  │
│          │    (direct P2P message)             │          │
│          │                                    │          │
│          │◄─── Tor Circuit 2 ─────────────────┤          │
│          │    (direct P2P reply)               │          │
└──────────┘                                    └──────────┘
```

No relay servers, no SNODEs, no central infrastructure. Messages travel from sender's device directly to recipient's device through the Tor network.

### 4.3 Offline Message Queue

When a recipient is offline:
1. Sender stores the encrypted message in a local priority queue
2. Sender periodically sends PING probes to the recipient's hidden service
3. When recipient comes online, PONG response triggers message delivery
4. Messages are delivered in order with deduplication via message IDs
5. After confirmed delivery (ACK), the local copy is cryptographically erased

---

## 5. Shield Messenger Protocol

### 5.1 Ping-Pong Wake Protocol

The Ping-Pong protocol solves the fundamental challenge of P2P messaging: both parties must be online simultaneously. Shield Messenger minimizes battery and network usage through an efficient wake mechanism:

```
State Machine:

IDLE ──[outgoing message]──► PINGING
PINGING ──[PONG received]──► DELIVERING
PINGING ──[timeout]──► QUEUED
QUEUED ──[retry timer]──► PINGING
DELIVERING ──[ACK received]──► IDLE
DELIVERING ──[timeout]──► QUEUED
```

### 5.2 Three-Phase Friend Request

**Phase 1: Initial Request**
```
request = XSalsa20-Poly1305.Encrypt(
    key = Argon2id(PIN),
    plaintext = {
        sender_identity_key: Ed25519_public,
        sender_discovery_onion: "abc...onion",
        sender_display_name: "Alice",
        ephemeral_x25519_public: X25519_ephemeral_public,
        ml_kem_encapsulation: ML-KEM-1024_ciphertext,
        timestamp: unix_ms
    }
)
```

**Phase 2: Acceptance**
- Recipient decrypts with PIN, verifies identity key
- Performs hybrid key exchange (X25519 + ML-KEM-1024)
- Sends encrypted acceptance with own identity keys and messaging onion address

**Phase 3: Mutual Acknowledgment**
- Both parties exchange full contact cards
- Messaging session keys are established
- Each party begins monitoring the other's messaging hidden service

### 5.3 Voice Calling

Real-time voice communication over Tor:

1. **Codec**: Opus variable bitrate (8-24 kbps for Tor compatibility)
2. **Encryption**: Per-frame XChaCha20-Poly1305 with sequential nonces
3. **Transport**: Direct Tor hidden service connection (UDP-over-TCP via Tor)
4. **Latency mitigation**: Adaptive jitter buffer (50-200ms) and Opus FEC

---

## 6. Key Management

### 6.1 Key Hierarchy

```
Master Key (hardware-backed StrongBox/TEE)
├── Identity Key (Ed25519) — long-term, device-bound
├── Signing Key (Ed25519) — rotatable
├── Pre-Keys (X25519) — one-time use
│   └── Pre-Key bundle (100 keys, regenerated as consumed)
├── Session Keys (per contact)
│   ├── Root Key (from initial key exchange)
│   ├── Sending Chain Key
│   │   └── Message Keys [0, 1, 2, ...]
│   └── Receiving Chain Key
│       └── Message Keys [0, 1, 2, ...]
└── Payment Keys (hierarchical deterministic)
    ├── Zcash Spending Key
    └── Solana Keypair
```

### 6.2 Hardware-Backed Storage

On supported Android devices:
- Master key stored in **StrongBox** (dedicated secure hardware)
- Fallback to **TEE** (Trusted Execution Environment) on older devices
- Keys never leave the secure hardware; all crypto operations happen inside it

### 6.3 Duress PIN

A secondary PIN that triggers immediate cryptographic erasure:
1. Zeroes all key material in hardware-backed storage
2. Overwrites SQLCipher database with random data
3. Clears all Tor hidden service keys
4. Displays a convincing "factory reset" screen
5. The device appears to have been reset, not wiped under duress

---

## 7. Secure Pay Protocol

### 7.1 In-Chat Payment Flow

```
Alice                                          Bob
  │                                              │
  ├── Create payment quote ──────────────────────►│
  │   {amount, currency, memo, expiry}           │
  │                                              ├── Review & accept
  │◄────────────────── Acceptance + address ──────┤
  │                                              │
  ├── Sign & broadcast transaction                │
  ├── Send tx_hash + proof ──────────────────────►│
  │                                              ├── Verify on-chain
  │◄────────────────── Confirmation ──────────────┤
```

### 7.2 Supported Chains

| Chain | Assets | Privacy Level |
|-------|--------|--------------|
| **Zcash** | ZEC (shielded z-addresses) | Full privacy (zk-SNARKs) |
| **Solana** | SOL, USDC, USDT | Pseudonymous |

### 7.3 Wallet Security

- Private keys derived from master key via BIP-32/44 path
- All keys stored in hardware-backed keystore
- Transaction signing occurs on-device only
- No private key material ever leaves the device

---

## 8. Threat Model

### 8.1 Adversaries Considered

| Adversary | Capability | Mitigation |
|-----------|-----------|------------|
| **Passive Network Observer** | Monitors all network traffic | Tor hidden services (no IP exposure) |
| **Active Network Attacker** | Can inject, modify, drop packets | Ed25519 signatures, Tor E2E encryption |
| **Compromised Server** | Full access to server data | No servers exist to compromise |
| **Law Enforcement (legal)** | Subpoena, warrant | No data exists to be subpoenaed |
| **State-Level Adversary** | Tor traffic analysis, zero-days | Triple .onion, hardware-backed keys |
| **Quantum Computer (future)** | Break ECDH key exchange | Hybrid ML-KEM-1024 + X25519 |
| **Physical Device Access** | Stolen/seized device | SQLCipher encryption, duress PIN |

### 8.2 Limitations

Shield Messenger does **not** protect against:
- Compromised device hardware (supply chain attacks)
- Endpoint malware with root/kernel access
- Human-factor attacks (social engineering, phishing)
- Tor network-wide traffic analysis by a global passive adversary
- Side-channel attacks on the device's cryptographic implementations

### 8.3 Security Assumptions

1. The Tor network provides adequate anonymity for hidden service connections
2. XChaCha20-Poly1305 is semantically secure under chosen-ciphertext attack
3. Ed25519 signatures are existentially unforgeable under chosen-message attack
4. ML-KEM-1024 is IND-CCA2 secure (as standardized in FIPS 203)
5. The device's hardware-backed keystore correctly isolates key material

---

## 9. Implementation

### 9.1 Rust Core

The cryptographic core is implemented in Rust for memory safety and performance. A single shared library provides all cryptographic and protocol operations across all platforms:

- **Android**: JNI (Java Native Interface) bindings
- **iOS**: C FFI (Foreign Function Interface) bindings
- **Web**: WebAssembly (WASM) bindings via wasm-bindgen

### 9.2 Platform Support

| Platform | Language | UI Framework | Status |
|----------|---------|-------------|--------|
| **Android** | Kotlin | Material Design 3 | Production (153 files) |
| **Web** | TypeScript | React 19 + Tailwind | Beta |
| **iOS** | Swift | SwiftUI | Development |
| **Server** | TypeScript | Express 4 | Production |

### 9.3 Code Metrics

- **Android**: 153 Kotlin files, 49 Activities, 16 Services, 16 DAOs
- **Rust Core**: ~15,000 lines, 6 modules (crypto, network, protocol, storage, ffi, securepay)
- **Web**: React 19, TypeScript, 175 automated tests
- **Server**: Express 4, TypeScript, 131 automated tests, 14 database tables
- **Total Tests**: 306 automated tests, all passing

---

## 10. Comparison with Existing Solutions

### 10.1 Signal Protocol

Signal uses a centralized server model for message relay and contact discovery. While the Signal Protocol (Double Ratchet) provides strong E2E encryption, Signal's servers necessarily see metadata: who messages whom and when. Shield Messenger eliminates this by using direct P2P connections over Tor.

### 10.2 Session (Oxen)

Session removes phone number requirements and uses a decentralized network of Service Nodes (SNODEs). However, SNODEs are still infrastructure that can be monitored, and Session does not implement post-quantum cryptography. Shield Messenger uses direct Tor connections with no intermediary nodes and includes hybrid post-quantum key exchange.

### 10.3 Briar

Briar supports Tor-based messaging but has limited platform support (Android only), no payment integration, and no post-quantum cryptography. Shield Messenger provides multi-platform support, integrated crypto payments, and hybrid post-quantum encryption.

### 10.4 SimpleX Chat

SimpleX uses relay servers for message delivery and does not implement post-quantum cryptography in its key exchange. Shield Messenger's direct P2P approach eliminates relay infrastructure entirely.

---

## 11. Future Work

### 11.1 Post-Quantum Double Ratchet

Implement full post-quantum ratcheting where each DH ratchet step uses hybrid X25519 + ML-KEM-1024, providing post-quantum forward secrecy for every ratchet epoch.

### 11.2 Group Messaging

Multi-party E2E encryption using Sender Keys with post-quantum group key agreement. Each group member maintains pairwise sessions with all other members, and a shared group key is derived via multi-party key exchange.

### 11.3 Reproducible Builds

Deterministic build system to allow independent verification that distributed binaries match the published source code.

### 11.4 Mesh Networking

WiFi Direct and Bluetooth mesh networking for communication without internet connectivity, enabling usage in environments with internet censorship or infrastructure damage.

---

## 12. References

1. Mayer, J., Mutchler, P., & Mitchell, J.C. (2016). "Evaluating the privacy properties of telephone metadata." *PNAS*, 113(20), 5536-5541.
2. NIST (2024). "FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism Standard."
3. Bernstein, D.J. (2006). "Curve25519: New Diffie-Hellman Speed Records." *PKC 2006*.
4. Bernstein, D.J., et al. (2012). "High-speed high-security signatures." *Journal of Cryptographic Engineering*, 2(2), 77-89.
5. Nir, Y. & Langley, A. (2018). "ChaCha20 and Poly1305 for IETF Protocols." *RFC 8439*.
6. Krawczyk, H. & Eronen, P. (2010). "HMAC-based Extract-and-Expand Key Derivation Function (HKDF)." *RFC 5869*.
7. Biryukov, A., Dinu, D., & Khovratovich, D. (2021). "Argon2: The Memory-Hard Function for Password Hashing and Other Applications." *RFC 9106*.
8. Dingledine, R., Mathewson, N., & Syverson, P. (2004). "Tor: The Second-Generation Onion Router." *USENIX Security Symposium*.

---

*Shield Messenger — No servers. No metadata. No compromises.*

*Copyright &copy; 2025-2026 Shield Messenger. All rights reserved.*
