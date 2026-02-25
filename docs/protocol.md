# Shield Messenger Protocol Specification

**Version:** 1.0-draft  
**Date:** 2025-01-01  
**Status:** Implementation Reference

---

## 1. Overview

Shield Messenger operates as a fully peer-to-peer encrypted messaging system over Tor hidden services. There are **no central relay servers** — every message travels directly between sender and recipient through the Tor network.

**Design Goals:**

1. Zero metadata leakage (no server logs, no connection graphs)
2. Post-quantum forward secrecy via hybrid X25519 + ML-KEM-1024
3. Traffic analysis resistance through fixed-size packets and cover traffic
4. Offline message delivery via local queues and wake signaling
5. Plausible deniability through deniable encryption and dead man's switch

---

## 2. Transport Layer

### 2.1 Triple .onion Architecture

Each Shield Messenger client maintains three independent Tor hidden services:

| Service | Port | Purpose |
|---------|------|---------|
| **Discovery** | 9152 | Contact discovery via QR code scanning |
| **Friend Request** | 9151 | Receiving PIN-encrypted friend requests |
| **Messaging** | 9150 | End-to-end encrypted message exchange |

Each hidden service uses a separate Ed25519 identity key, providing compartmentalization — compromising one service does not reveal the others.

### 2.2 Tor Integration

**Primary:** Pure-Rust Arti client (no C dependencies)  
**Fallback:** C Tor via subprocess + control port (SOCKS5 on 127.0.0.1:9050)

Circuit isolation is enforced per-conversation. Each peer pair uses a dedicated Tor circuit with a unique `IsolationToken` to prevent traffic correlation between conversations.

### 2.3 Cover Traffic

The system generates indistinguishable cover traffic at random intervals (Poisson distribution, λ = 1 packet/10s by default). Cover packets are:

- Identical in size (8192 bytes) to real packets
- Authenticated with the same HMAC scheme
- Type-tagged as `CoverTraffic` (0x05) — indistinguishable from real traffic to external observers because the type byte is inside the encrypted payload

---

## 3. Key Exchange Layer

### 3.1 Hybrid KEM (X25519 + ML-KEM-1024)

Every key exchange produces a **shared secret** derived from two independent mechanisms:

1. **X25519 ECDH** — classical elliptic-curve Diffie-Hellman (32-byte shared secret)
2. **ML-KEM-1024** — NIST FIPS 203 post-quantum key encapsulation (32-byte shared secret)

The combined shared secret is computed via:

```
combined = BLAKE3-KDF(
    context: "shield-messenger-hybrid-kem-v1",
    input:   x25519_shared || mlkem_shared
)
```

This produces a 32-byte key that is secure as long as **either** X25519 or ML-KEM remains unbroken.

### 3.2 Key Sizes

| Component | Size (bytes) |
|-----------|-------------|
| X25519 public key | 32 |
| X25519 secret key | 32 |
| ML-KEM-1024 encapsulation key | 1568 |
| ML-KEM-1024 decapsulation seed | 64 |
| ML-KEM-1024 ciphertext | 1568 |
| Combined shared secret | 32 |

### 3.3 Safety Numbers

For contact verification, both parties compute a safety number:

```
safety_number = BLAKE3(
    context: "shield-messenger-safety-number-v1",
    input:   sort(alice_x25519_pub || alice_mlkem_pub, bob_x25519_pub || bob_mlkem_pub)
)
```

The result is displayed as 12 groups of 5 digits (60 digits total) for human comparison.

### 3.4 Three-Phase Friend Request

```
Phase 1: PIN-Encrypted Request
  Alice → Bob (Friend Request service, port 9151):
    XSalsa20-Poly1305(PIN, request_payload{
      alice_discovery_onion,
      alice_messaging_onion,
      alice_x25519_pub,
      alice_mlkem_ek,
      alice_ed25519_pub,
      display_name,
      timestamp
    })

Phase 2: Hybrid Acceptance
  Bob → Alice (Messaging service, port 9150):
    HybridEncrypt(alice_keys, acceptance_payload{
      bob_discovery_onion,
      bob_messaging_onion,
      bob_x25519_pub,
      bob_mlkem_ek,
      bob_ed25519_pub,
      display_name,
      timestamp,
      signature(ed25519)
    })

Phase 3: Mutual Acknowledgment
  Alice → Bob:
    HybridEncrypt(bob_keys, ack_payload{
      confirmed: true,
      safety_number,
      signature(ed25519)
    })
```

---

## 4. Message Layer — PQ Double Ratchet

### 4.1 Overview

Shield Messenger implements a Post-Quantum Double Ratchet that extends the Signal Double Ratchet with periodic ML-KEM-1024 ratchet steps.

Three ratchet mechanisms operate simultaneously:

1. **Symmetric Ratchet** (every message) — HMAC-SHA256 chain key derivation
2. **DH Ratchet** (every direction change) — X25519 ephemeral key exchange
3. **KEM Ratchet** (every 50 messages) — ML-KEM-1024 encapsulation

### 4.2 State

```
RatchetState {
    root_key:         [u8; 32],     // Root chain key
    send_chain_key:   [u8; 32],     // Sending chain key
    recv_chain_key:   [u8; 32],     // Receiving chain key
    send_count:       u32,          // Messages sent since last DH ratchet
    recv_count:       u32,          // Messages received since last DH ratchet
    previous_send:    u32,          // Send count before last DH ratchet
    our_dh_public:    [u8; 32],     // Our current X25519 public key
    our_dh_secret:    [u8; 32],     // Our current X25519 secret key
    their_dh_public:  [u8; 32],     // Peer's current X25519 public key
    our_kem_ek:       Vec<u8>,      // Our current ML-KEM encapsulation key
    our_kem_seed:     Vec<u8>,      // Our current ML-KEM decapsulation seed
    their_kem_ek:     Vec<u8>,      // Peer's current ML-KEM encapsulation key
    kem_epoch:        u32,          // KEM ratchet epoch counter
    total_sent:       u64,          // Lifetime message counter
    skipped_keys:     HashMap<(Vec<u8>, u32), [u8; 32]>,  // Out-of-order keys
}
```

### 4.3 KDF Functions

**Root KDF (BLAKE3):**
```
(new_root_key, chain_key) = BLAKE3-KDF(
    context: "shield-ratchet-root-v1",
    input:   root_key || dh_output
)
output split: first 32 bytes → new root_key, next 32 bytes → chain_key
```

**Chain KDF (HMAC-SHA256):**
```
new_chain_key = HMAC-SHA256(chain_key, 0x01)
message_key   = HMAC-SHA256(chain_key, 0x02)
```

### 4.4 Ratchet Step Procedures

**Symmetric Ratchet (every encrypt/decrypt):**
```
message_key = HMAC-SHA256(chain_key, 0x02)
chain_key   = HMAC-SHA256(chain_key, 0x01)
send_count += 1
```

**DH Ratchet (on receiving new peer DH public key):**
```
1. Store previous_send = send_count
2. recv_count = 0, send_count = 0
3. their_dh_public = header.dh_public
4. (root_key, recv_chain_key) = KDF_ROOT(root_key, DH(our_dh_secret, their_dh_public))
5. Generate new (our_dh_secret, our_dh_public) = X25519::generate()
6. (root_key, send_chain_key) = KDF_ROOT(root_key, DH(our_dh_secret, their_dh_public))
```

**KEM Ratchet (every 50 messages):**
```
1. If total_sent % 50 == 0 AND their_kem_ek is available:
2.   (kem_ciphertext, kem_shared) = ML-KEM-1024.Encapsulate(their_kem_ek)
3.   root_key = BLAKE3-KDF("shield-kem-ratchet-v1", root_key || kem_shared)
4.   Generate new (our_kem_seed, our_kem_ek) = ML-KEM-1024.KeyGen()
5.   kem_epoch += 1
6.   Attach kem_ciphertext and new our_kem_ek to message header
```

### 4.5 Message Header

```
RatchetHeader {
    dh_public:       [u8; 32],        // Sender's current X25519 public key
    previous_count:  u32,             // Messages in previous sending chain
    message_number:  u32,             // Message number in current chain
    kem_ciphertext:  Option<Vec<u8>>, // ML-KEM ciphertext (every 50 msgs)
    new_kem_ek:      Option<Vec<u8>>, // Sender's new ML-KEM encap key
    kem_epoch:       u32,             // KEM ratchet epoch
}
```

### 4.6 Out-of-Order Delivery

Messages arriving out of order are handled by:

1. Checking skipped keys cache first (keyed by `(dh_public, message_number)`)
2. If not found, advancing the chain and caching intermediate keys
3. Maximum 200 skipped keys stored (configurable via `MAX_SKIP`)
4. Skipped keys are consumed on use (one-time decryption)

---

## 5. Packet Format

### 5.1 Fixed-Size Packets

All packets are exactly **8192 bytes** to prevent traffic analysis based on message length.

```
┌─────────┬──────┬──────────────┬─────────────┬──────────────┬──────────┐
│ Version │ Type │ Payload Len  │   Payload   │ Random Pad   │   HMAC   │
│  1 byte │ 1 B  │   4 bytes    │  0–8154 B   │   variable   │  32 B    │
└─────────┴──────┴──────────────┴─────────────┴──────────────┴──────────┘
                                 ◄──── 8154 bytes ────────────►
Total: 8192 bytes exactly
```

### 5.2 Packet Types

| Code | Type | Description |
|------|------|-------------|
| 0x00 | Message | Encrypted chat message |
| 0x01 | KeyExchange | Key exchange material |
| 0x02 | PingPong | Wake protocol signaling |
| 0x03 | FileChunk | File transfer fragment |
| 0x04 | VoiceFrame | Encrypted voice audio |
| 0x05 | CoverTraffic | Dummy traffic for padding |

### 5.3 HMAC Authentication

Each packet is authenticated with HMAC-SHA256:

```
hmac = HMAC-SHA256(hmac_key, packet[0..8160])
```

The HMAC covers the version, type, payload length, payload, and random padding — everything except the HMAC itself.

### 5.4 Fragmentation

Payloads exceeding `MAX_PAYLOAD` (8154 bytes) are fragmented:

```
Fragment header (within payload):
  [fragment_id: 4 bytes][fragment_index: 2 bytes][total_fragments: 2 bytes][data]

Reassembly:
  1. Collect all fragments with matching fragment_id
  2. Sort by fragment_index
  3. Concatenate data portions
  4. Verify total_fragments count matches
```

---

## 6. Encrypted Backup & Social Recovery

### 6.1 Backup Encryption

```
1. salt = random(32 bytes)
2. key = Argon2id(password, salt, m=65536 KiB, t=4, p=1)
3. nonce = random(24 bytes)
4. ciphertext = XChaCha20-Poly1305.Encrypt(key, nonce, plaintext_backup)
5. blob = { salt, nonce, ciphertext }
```

### 6.2 Shamir's Secret Sharing

For social recovery, the backup encryption key is split into `n` shares with threshold `k`:

- Polynomial over GF(256): `f(x) = secret + a₁·x + a₂·x² + ... + aₖ₋₁·x^(k-1)`
- Each share is `(x_i, f(x_i))` for `x_i ∈ {1, 2, ..., n}`
- Any `k` shares reconstruct the secret via Lagrange interpolation
- GF(256) arithmetic uses the irreducible polynomial `x⁸ + x⁴ + x³ + x + 1`

---

## 7. Dead Man's Switch

An automatic key destruction mechanism:

1. User configures check-in interval (minimum 24 hours)
2. User must check in before interval expires
3. On first miss: enters grace period (configurable count of additional intervals)
4. After all grace periods expire: executes configured `WipeAction`s
5. Wipe actions: delete keys, delete messages, delete contacts, purge all local data

---

## 8. Security Invariants

1. **Forward Secrecy:** Every message uses a unique message key derived from the chain ratchet. Compromising any single key does not reveal past or future messages.

2. **Post-Quantum Secrecy:** The KEM ratchet ensures that even if X25519 is broken by a quantum computer, the periodic ML-KEM-1024 ratchet steps protect all messages after the next KEM epoch.

3. **Deniability:** No long-term signatures are attached to messages. Message authentication uses symmetric HMACs derived from shared secrets — either party could have produced any message.

4. **Metadata Resistance:** Fixed-size packets, cover traffic, and Tor circuit isolation prevent an observer from determining message timing, size, or conversation participants.

5. **Key Zeroization:** All secret keys implement `Zeroize` and are wiped from memory immediately after use. The `zeroize` crate provides compiler-fence guarantees against dead-store elimination.

6. **No Key Reuse:** Message keys are consumed exactly once. Skipped keys are cached temporarily and deleted after use.

---

## 9. Threat Model

### 9.1 Attacker Capabilities

| Threat Level | Capability |
|-------------|------------|
| **Passive Global** | Observe all network traffic (ISP, backbone) |
| **Active Network** | MITM, packet injection, replay |
| **Server Compromise** | N/A — no servers to compromise |
| **Device Seizure** | Physical access to unlocked/locked device |
| **Quantum Computer** | Break ECDH, RSA (future, ~2035+) |

### 9.2 Mitigations

| Attack | Mitigation |
|--------|-----------|
| Traffic analysis | Fixed-size packets + cover traffic + Tor |
| Message replay | Monotonic counters + consumed message keys |
| Key compromise | Forward secrecy (per-message) + KEM ratchet |
| Quantum harvest-now-decrypt-later | ML-KEM-1024 hybrid KEM |
| Device seizure (unlocked) | Duress PIN → instant cryptographic wipe |
| Device seizure (locked) | Hardware-backed keys (StrongBox/TEE) |
| Metadata correlation | Circuit isolation + triple .onion |
| Social graph mapping | No contact server, no phone number requirement |

### 9.3 Out of Scope

- Hardware supply chain attacks (compromised SoC/firmware)
- Endpoint malware with kernel-level access (keyloggers, screen capture)
- Rubber-hose cryptanalysis (physical coercion of key holder)
- Side-channel attacks on ML-KEM (mitigated by constant-time implementation in ml-kem crate)

---

## 10. Wire Format Summary

```
Friend Request (Phase 1):
  XSalsa20-Poly1305(PIN_derived_key, request_cbor)

Message (standard):
  Packet(8192) {
    version: 0x01,
    type: 0x00 (Message),
    payload: RatchetHeader || XChaCha20-Poly1305(message_key, plaintext_cbor),
    padding: random,
    hmac: HMAC-SHA256(session_hmac_key, header || payload || padding)
  }

KEM Ratchet Message:
  Packet(8192) {
    version: 0x01,
    type: 0x01 (KeyExchange),
    payload: RatchetHeader{kem_ciphertext, new_kem_ek} || encrypted_data,
    padding: random,
    hmac: HMAC-SHA256(session_hmac_key, ...)
  }

Cover Traffic:
  Packet(8192) {
    version: 0x01,
    type: 0x05 (CoverTraffic),
    payload: random,
    padding: random,
    hmac: HMAC-SHA256(session_hmac_key, ...)
  }
```

---

*This document describes the Shield Messenger protocol as implemented in the `securelegion` Rust core library. For implementation details, see the source code in `secure-legion-core/src/`.*
