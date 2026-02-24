# Shield Messenger (Secure Legion) — Protocol Specification

**Version:** 2.0  
**Status:** Design + Implementation Reference  
**Traffic Analysis Resistance:** Fixed-size packets (configurable 4096/8192/16384), truncated-exponential delays, cover traffic.  
**Post-Quantum:** Hybrid X25519 + ML-KEM-1024 (NIST FIPS 203) for key agreement and ratchet.

---

## 1. Overview

- **Goal:** Private messaging with minimal metadata, resistance to traffic analysis, and post-quantum security.
- **Transport:** Tor v3 (onion services). Optional migration path to Arti (Rust Tor) for circuit isolation and ephemeral hidden services.
- **Wire invariant:** No message leaves the stack without padding to the fixed packet size (see section 4).

---

## 2. Onion / Identity

- **v3 .onion address:** Derived from Ed25519 seed per rend-spec-v3:
  - `onion_address = base32(pubkey || checksum || 0x03) + ".onion"`
  - `checksum = SHA3-256(".onion checksum" || pubkey || 0x03)[0..2]`
- **Ports (canonical):**
  - `9150` -- PING/PONG/ACK (discovery + handshake)
  - `9151` -- TAP (reserved)
  - `9152` -- Voice
  - `9153` -- Dedicated ACK listener

---

## 3. Key Agreement & Ratchet

### 3.1 Initial key agreement

- **Hybrid KEM:** X25519 + ML-KEM-1024 (Kyber).
- Sender encapsulates to recipient's `(X25519_pk, Kyber_pk)` producing combined 64-byte shared secret.
- Root key: `HKDF-SHA256(combined_secret, "SecureLegion-RootKey-v1")` (32 bytes).

### 3.2 Symmetric ratchet (per-session)

- **Root key** produces two chains (outgoing / incoming) via lexicographic comparison of .onion addresses:
  - `outgoing_chain = HMAC-SHA256(root_key, 0x03)`
  - `incoming_chain = HMAC-SHA256(root_key, 0x04)`
- **Chain evolution:** `next_chain = HMAC-SHA256(chain_key, 0x01)`; previous chain key is zeroized.
- **Message key:** `message_key = HMAC-SHA256(chain_key, 0x02)`; used for one message only.
- **Wire format (encrypted):** `[version:1][sequence:8][nonce:24][ciphertext][tag:16]` (XChaCha20-Poly1305).

### 3.3 Post-quantum ratchet (KEM ratchet)

- A **KEM ratchet step** can be performed to achieve post-compromise security:
  - Each step: hybrid encapsulate to peer's current KEM public key producing new 64-byte shared secret, then new root key via HKDF.
  - After a KEM step, old root key and chain keys are **zeroized immediately**; symmetric chains are re-initialized from the new root key; sequences reset to 0.
  - Skipped-message key cache is also purged on KEM ratchet (no stale keys survive rekey).
- Optional: KEM ratchet on every N messages or on explicit "rekey" events.

### 3.4 Out-of-order message handling

- The receiving chain maintains a **skipped-key cache** (up to 256 messages ahead).
- When a message arrives with sequence > expected: derive and cache intermediate message keys, then advance the chain.
- Cached keys are consumed on use and zeroized. Duplicates are rejected.
- After a KEM ratchet step, all cached skipped keys are purged.

### 3.5 Two-phase commit (PING_ACK)

- Sender does not commit ratchet advancement until PING_ACK is received.
- Deferred encrypt: store pending (contact_id, next_chain_key, next_sequence); on PING_ACK, commit and persist.

---

## 4. Traffic Analysis Resistance

### 4.1 Fixed packet size (configurable)

- **Fixed payload size:** Configurable at runtime: 4096 (default), 8192, or 16384 bytes. Set via `set_fixed_packet_size()` before any I/O.
- **Wire format:** `[length:4 BE][payload:fixed_packet_size()]`. Every packet on the wire is exactly `4 + fixed_packet_size()` bytes.
- **Payload layout:** `[len:2 BE][real_payload][random_padding]`. Receiver reads length prefix, extracts payload, discards padding.
- 8192 or 16384 recommended for voice/video streams to avoid multi-packet correlation.

### 4.2 Random delays -- truncated exponential

- Before sending PING, PONG, or ACK, the stack applies a random delay in [200, 800] ms using a **truncated exponential distribution** (lambda=0.005). This avoids the flat pattern of uniform distribution that could be fingerprinted.

### 4.3 Cover traffic

- When the connection is idle for > 30-90 seconds (random interval), the stack sends a **cover (dummy) packet** (type `0xFF`) padded to fixed size with a random nonce.
- Receiver discards cover packets silently (no processing, no ACK).
- This prevents silence-gap analysis ("they stopped talking at 14:03").

### 4.4 Constant-time

- All comparisons on keys, nonces, and authentication tags use constant-time equality via `ct_eq!` macro (`subtle::ConstantTimeEq`). No early-exit on mismatch.

---

## 5. Message Types (wire)

First byte of payload (after stripping padding) is the message type:

| Type   | Value | Description        |
|--------|-------|--------------------|
| PING   | 0x01  | Handshake probe    |
| PONG   | 0x02  | Handshake ack      |
| TEXT   | 0x03  | Text message       |
| VOICE  | 0x04  | Voice payload      |
| TAP    | 0x05  | Tap / reserved     |
| ACK    | 0x06  | Delivery ack       |
| FRIEND_REQUEST | 0x07 | Friend request     |
| FRIEND_REQUEST_ACCEPTED | 0x08 | Accept |
| IMAGE  | 0x09  | Image              |
| ...    | ...   | (see code)         |
| CRDT_OPS | 0x30 | CRDT op bundle     |
| SYNC_REQUEST | 0x32 | Sync request   |
| SYNC_CHUNK | 0x33  | Sync chunk      |
| ROUTING_* | 0x35, 0x36 | Routing      |
| COVER  | 0xFF  | Cover traffic (discard on receive) |

Payload for encrypted types: `[sender_x25519_pubkey:32][encrypted_body]`. Encrypted body format per section 3.2.

---

## 6. Ping-Pong Wake Protocol

1. Sender builds Ping (Ed25519 signed; includes sender/recipient pubkeys, X25519 keys, nonce, timestamp).
2. Sender sends Ping to recipient's .onion:9150 (payload padded to fixed size; random delay applied).
3. Recipient verifies signature, checks timestamp, optionally authenticates user; sends Pong (signed).
4. Sender receives Pong; then sends application message(s).
5. Receiver sends ACK (type PING_ACK / MESSAGE_ACK / etc.) for delivery confirmation.
6. Sender commits ratchet on PING_ACK (two-phase commit).

---

## 7. Plausible Deniability (app layer)

- **Deniable storage:** DB layer (e.g. SQLCipher) is encrypted so that without the key, content is indistinguishable from random.
- **Duress PIN:** A second PIN that, when entered:
  1. Calls `on_duress_pin_entered()` so the core clears in-memory sensitive state (pending ratchets, chain keys).
  2. App wipes the real database, zeroizes the real key from memory.
  3. App calls `generate_decoy_data(config)` so the core generates plausible fake contacts, messages, and .onion addresses.
  4. App populates a new DB with decoy data so the device "looks normal" to a forensic examiner.
- **Stealth mode** (optional): After duress, the app hides its launcher icon / alias so the app is not visible in the app drawer. Configured via `StealthModeSpec`.

---

## 8. Tor / Onion Hardening (future)

- **Target:** Arti (Rust Tor) for embedded use: no external Tor binary, full control. See **docs/arti-migration.md** for the migration path.
- **Ephemeral hidden services:** Create/destroy .onion per session or per service.
- **Circuit isolation:** Separate circuits for discovery, request, and messaging (e.g. discovery != request != messaging).
- **Cover traffic:** Optional dummy packets on the same circuits to reduce correlation.

---

## 9. Invariants (assertions in code)

- **No message leaves without padding:** PONG and ACK are always padded to `fixed_packet_size()`; the send path uses `pad_to_fixed_size` and returns an error if padding fails. `debug_assert_eq!(to_send.len(), fixed_packet_size())` in the send path.
- All key/nonce/tag comparisons use constant-time equality (`ct_eq!` macro).
- Ratchet advancement is not persisted until PING_ACK (or equivalent) is received; rollback on send failure.
- Old root keys are zeroized immediately after KEM ratchet steps.
- Skipped message keys are zeroized after consumption or on KEM ratchet.

## 10. Duress PIN (app integration)

- When the user enters the Duress PIN, the app must:
  1. Call **`on_duress_pin_entered()`** (Rust) / **`RustBridge.onDuressPinEntered()`** (Android JNI) so the core clears in-memory sensitive state (e.g. pending ratchet keys).
  2. Wipe the real database and zeroize the real encryption key (app responsibility).
  3. Call **`generate_decoy_data(&config)`** to produce plausible fake contacts and messages.
  4. Populate the new DB with decoy data (app responsibility).
  5. Optionally activate **stealth mode** (hide app icon) via `StealthModeSpec`.

---

## 11. Threat Model

### 11.1 Adversary capabilities

| Adversary | Capability | Mitigation |
|-----------|-----------|------------|
| **Global passive observer** | Sees all Tor traffic between guard/exit nodes; correlates packet sizes and timing. | Fixed-size padding (configurable 4096/8192/16384), truncated-exponential random delays (200-800 ms), cover traffic on idle connections (30-90 s). |
| **Active network adversary** | Injects, drops, replays, or reorders packets. | Ed25519 signatures on PING/PONG, sequence numbers with replay rejection, HMAC chain for message integrity, windowed sequence acceptance. |
| **Compromised device (momentary)** | Extracts current chain keys from memory. | Post-Compromise Security via KEM ratchet steps (ML-KEM-1024); after a single KEM step, future messages are unreadable with old keys. All message keys zeroized immediately after use. |
| **Compromised device (persistent)** | Ongoing access to the device. | Duress PIN: instant wipe of real DB + core state + decoy data generation. Stealth mode hides app. Forward secrecy: past message keys are irrecoverable. |
| **Quantum adversary (future)** | Breaks X25519 / ECDH with Shor's algorithm. | Hybrid X25519 + ML-KEM-1024 key agreement. Root key is secure if EITHER primitive remains unbroken. KEM ratchet steps periodically refresh post-quantum security. |
| **Side-channel (timing / cache)** | Measures comparison timing or cache access patterns. | Constant-time equality (`ct_eq!` macro, `subtle::ConstantTimeEq`) for all key, nonce, tag, and pubkey comparisons. No branching on secret data. |
| **Forensic analysis of storage** | Analyzes raw DB bytes on seized device. | SQLCipher (or equivalent) with HMAC: without key, data is indistinguishable from random. No plaintext length leakage. Duress PIN produces plausible decoy data. |
| **Metadata analysis** | Analyzes who talks to whom and when. | Tor v3 onion services (no clearnet metadata). Future: Arti with circuit isolation (discovery != request != messaging) and ephemeral hidden services. |

### 11.2 Security properties

| Property | Status | Mechanism |
|----------|--------|-----------|
| **Confidentiality** | Implemented | XChaCha20-Poly1305 with per-message keys derived from HMAC chain. |
| **Integrity** | Implemented | Poly1305 authentication tag; Ed25519 signatures on control messages. |
| **Forward secrecy** | Implemented | Chain key evolution (HMAC one-way); old keys zeroized. |
| **Post-compromise security** | Implemented | KEM ratchet steps with ML-KEM-1024 reset root key and all chains. |
| **Post-quantum security** | Implemented | Hybrid X25519 + ML-KEM-1024 for initial key agreement and KEM ratchet. |
| **Traffic analysis resistance** | Implemented | Fixed-size padding, truncated-exponential delays, cover traffic. |
| **Plausible deniability** | Implemented | Deniable storage; Duress PIN with decoy data generation + stealth mode. |
| **Replay protection** | Implemented | Sequence numbers, LRU replay cache (10K entries), windowed acceptance. |
| **Out-of-order tolerance** | Implemented | Skipped-message key cache (up to 256 ahead) in PQ ratchet. |

### 11.3 What is NOT protected

- **Endpoint compromise with full root access** -- if the adversary has persistent root on the device AND the user does not trigger Duress PIN, data can be exfiltrated.
- **Social engineering** -- user tricked into revealing PIN.
- **Tor guard/exit correlation** -- partially mitigated by onion services (no exit), but a global adversary can attempt traffic confirmation. Cover traffic raises the bar but does not eliminate this.

---

## 12. References

- NIST FIPS 203 (ML-KEM)
- Signal Double Ratchet, PQXDH / Triple Ratchet (post-quantum)
- Tor rend-spec-v3
- XChaCha20-Poly1305 (e.g. RFC draft)
- F-Droid Reproducible Builds
- Nix Flakes for reproducible builds (see `docs/nix-reproducible.md`)
