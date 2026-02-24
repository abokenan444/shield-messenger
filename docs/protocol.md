# Shield Messenger (Secure Legion) — Protocol Specification

**Version:** 1.0  
**Status:** Design + Implementation Reference  
**Traffic Analysis Resistance:** Fixed-size packets, random padding, optional random delays.  
**Post-Quantum:** Hybrid X25519 + ML-KEM-1024 (NIST FIPS 203) for key agreement and ratchet.

---

## 1. Overview

- **Goal:** Private messaging with minimal metadata, resistance to traffic analysis, and post-quantum security.
- **Transport:** Tor v3 (onion services). Optional migration path to Arti (Rust Tor) for circuit isolation and ephemeral hidden services.
- **Wire invariant:** No message leaves the stack without padding to the fixed packet size (see §4).

---

## 2. Onion / Identity

- **v3 .onion address:** Derived from Ed25519 seed per rend-spec-v3:
  - `onion_address = base32(pubkey || checksum || 0x03) + ".onion"`
  - `checksum = SHA3-256(".onion checksum" || pubkey || 0x03)[0..2]`
- **Ports (canonical):**
  - `9150` — PING/PONG/ACK (discovery + handshake)
  - `9151` — TAP (reserved)
  - `9152` — Voice
  - `9153` — Dedicated ACK listener

---

## 3. Key Agreement & Ratchet

### 3.1 Initial key agreement

- **Hybrid KEM:** X25519 + ML-KEM-1024 (Kyber).
- Sender encapsulates to recipient’s `(X25519_pk, Kyber_pk)` → combined 64-byte shared secret.
- Root key: `HKDF-SHA256(combined_secret, "SecureLegion-RootKey-v1")` (32 bytes).

### 3.2 Symmetric ratchet (per-session)

- **Root key** → two chains (outgoing / incoming) via lexicographic comparison of .onion addresses:
  - `outgoing_chain = HMAC-SHA256(root_key, 0x03)`
  - `incoming_chain = HMAC-SHA256(root_key, 0x04)`
- **Chain evolution:** `next_chain = HMAC-SHA256(chain_key, 0x01)`; previous chain key is zeroized.
- **Message key:** `message_key = HMAC-SHA256(chain_key, 0x02)`; used for one message only.
- **Wire format (encrypted):** `[version:1][sequence:8][nonce:24][ciphertext][tag:16]` (XChaCha20-Poly1305).

### 3.3 Post-quantum ratchet (KEM ratchet)

- A **KEM ratchet step** can be performed to achieve post-compromise security:
  - Each step: hybrid encapsulate to peer’s current KEM public key → new 64-byte shared secret → new root key (e.g. via HKDF).
  - After a KEM step, symmetric chains are re-initialized from the new root key.
- Optional: KEM ratchet on every N messages or on explicit “rekey” events.

### 3.4 Two-phase commit (PING_ACK)

- Sender does not commit ratchet advancement until PING_ACK is received.
- Deferred encrypt → store pending (contact_id, next_chain_key, next_sequence) → on PING_ACK → commit and persist.

---

## 4. Traffic Analysis Resistance

### 4.1 Fixed packet size

- **Fixed payload size:** `FIXED_PACKET_SIZE` (e.g. 4096 or 8192 bytes). All on-wire payloads (PING, PONG, ACK, TEXT, etc.) are padded to this size with random padding.
- **Wire format:** `[length:4 BE][payload:FIXED_PACKET_SIZE]`. So every packet on the wire is exactly `4 + FIXED_PACKET_SIZE` bytes.
- **Payload layout:** `[real_payload][padding_length:2 BE][random_padding]`. Receiver parses real payload length from content (or from a length field after type byte), then strips padding.

### 4.2 Random delays (Ping-Pong / ACK)

- Before sending PING, PONG, or ACK, the stack may apply a random delay in the range [200 ms, 800 ms] to reduce timing correlation.
- Implemented in the core send path for small control messages (e.g. length ≤ control threshold).

### 4.3 Constant-time

- All comparisons on keys, nonces, and authentication tags use constant-time equality (e.g. `subtle::ConstantTimeEq`). No early-exit on mismatch.

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
| …      | …     | (see code)         |
| CRDT_OPS | 0x30 | CRDT op bundle     |
| SYNC_REQUEST | 0x32 | Sync request   |
| SYNC_CHUNK | 0x33  | Sync chunk      |
| ROUTING_* | 0x35, 0x36 | Routing      |

Payload for encrypted types: `[sender_x25519_pubkey:32][encrypted_body]`. Encrypted body format per §3.2.

---

## 6. Ping-Pong Wake Protocol

1. Sender builds Ping (Ed25519 signed; includes sender/recipient pubkeys, X25519 keys, nonce, timestamp).
2. Sender sends Ping to recipient’s .onion:9150 (payload padded to fixed size; optional random delay).
3. Recipient verifies signature, checks timestamp, optionally authenticates user → sends Pong (signed).
4. Sender receives Pong; then sends application message(s).
5. Receiver sends ACK (type PING_ACK / MESSAGE_ACK / etc.) for delivery confirmation.
6. Sender commits ratchet on PING_ACK (two-phase commit).

---

## 7. Plausible Deniability (app layer)

- **Deniable storage:** DB layer (e.g. SQLCipher) is encrypted so that without the key, content is indistinguishable from random.
- **Duress PIN:** A second PIN that, when entered, wipes real data and (optionally) presents a plausible fake DB. Core exposes an interface for “wipe and optionally generate fake DB” so the app can implement this without exposing real keys.

---

## 8. Tor / Onion Hardening (future)

- **Target:** Arti (Rust Tor) for embedded use: no external Tor binary, full control. See **docs/arti-migration.md** for the migration path.
- **Ephemeral hidden services:** Create/destroy .onion per session or per service.
- **Circuit isolation:** Separate circuits for discovery, request, and messaging (e.g. discovery ≠ request ≠ messaging).
- **Cover traffic:** Optional dummy packets on the same circuits to reduce correlation.

---

## 9. Invariants (assertions in code)

- **No message leaves without padding:** PONG and ACK are always padded to `FIXED_PACKET_SIZE`; the send path uses `pad_to_fixed_size` and returns an error if padding fails (control messages are ≤ `MAX_PADDED_PAYLOAD`). `debug_assert_eq!(to_send.len(), FIXED_PACKET_SIZE)` in the send path.
- All key/nonce/tag comparisons use constant-time equality.
- Ratchet advancement is not persisted until PING_ACK (or equivalent) is received; rollback on send failure.

## 10. Duress PIN (app integration)

- When the user enters the Duress PIN, the app must:
  1. Call **`on_duress_pin_entered()`** (Rust) / **`RustBridge.onDuressPinEntered()`** (Android JNI) so the core clears in-memory sensitive state (e.g. pending ratchet keys).
  2. Wipe the real database and zeroize the real encryption key (app responsibility).
  3. If using `DuressPinSpec.show_plausible_fake`, replace with a plausible fake DB (app responsibility).

---

## 11. References

- NIST FIPS 203 (ML-KEM)
- Signal Double Ratchet, PQXDH / Triple Ratchet (post-quantum)
- Tor rend-spec-v3
- XChaCha20-Poly1305 (e.g. RFC draft)
