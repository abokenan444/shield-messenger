# AetherNet — Decentralized Mesh Networking for Shield Messenger

## Overview

AetherNet is Shield Messenger's multi-transport networking layer that combines Tor, I2P, and local mesh networking (BLE/Wi-Fi Direct/LoRa) into a unified, intelligent system. It dynamically selects the optimal transport based on network conditions, threat level, and connectivity — ensuring messages always reach their destination through the most secure and efficient path.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Shield Messenger App Layer                   │
│              (Android / iOS / Web PWA)                          │
├─────────────────────────────────────────────────────────────────┤
│                  AetherNet Abstraction Layer                    │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Transport  │  │   Identity   │  │    Smart Switcher        │ │
│  │  Manager   │  │    Vault     │  │  (Scoring Engine)        │ │
│  └─────┬─────┘  └──────┬───────┘  └────────────┬─────────────┘ │
├────────┼────────────────┼──────────────────────┼────────────────┤
│        │                │                      │                │
│   ┌────▼────┐    ┌──────▼──────┐    ┌──────────▼──────────┐    │
│   │   Tor   │    │     I2P     │    │      LibreMesh      │    │
│   │  (Arti) │    │ (SAM v3.1) │    │   (BLE/WiFi/LoRa)   │    │
│   └─────────┘    └─────────────┘    └─────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  Store-and-Forward  │ Crisis Controller │ Trust Map │ Solidarity│
│  Crowd-Adaptive Mesh│ Identity Vault    │           │ Relay     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Status

### Rust Core (`shield-messenger-core/src/aethernet/`)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| **AetherNet API** | `mod.rs` | **Implemented** | Main entry point, lifecycle, send/receive, tick, persistence |
| **Transport Trait** | `transport.rs` | **Implemented** | `NetworkTransport` trait, `Envelope`, `Route`, `TransportMetrics` |
| **Tor Transport** | `tor_transport.rs` | **Implemented** | SOCKS5 via Arti, hidden service send/receive, onion address integration |
| **I2P Transport** | `i2p_transport.rs` | **Implemented** | SAM v3.1 handshake, DATAGRAM send, inbound queue |
| **Mesh Transport** | `mesh_transport.rs` | **Implemented** | Peer discovery, outbox/inbox, platform callbacks (BLE/WiFi/LoRa) |
| **Smart Switcher** | `switcher.rs` | **Implemented** | Multi-factor scoring, threat-level sync with crisis controller |
| **Crisis Controller** | `crisis.rs` | **Implemented** | Activate/deactivate, padding, dummy traffic, priority override |
| **Identity Vault** | `identity_vault.rs` | **Implemented** | Per-transport Ed25519/X25519, rotation, encrypted persistence |
| **Store-and-Forward** | `store_forward.rs` | **Implemented** | Queue, retry with backoff, encrypted persistence (XChaCha20) |
| **Trust Map** | `trust_map.rs` | **Implemented** | Trust scoring, vouching, penalties, serialization |
| **Crowd Mesh** | `crowd_mesh.rs` | **Implemented** | Cluster formation, head election, epidemic routing |
| **Solidarity Relay** | `solidarity.rs` | **Implemented** | Onion relay, bandwidth limiting (50 MB/day), dedup |

### Android Integration

| Component | Status | Notes |
|-----------|--------|-------|
| **JNI Bindings** | **Implemented** | Full lifecycle + send/receive + mesh callbacks + persistence |
| **AetherNetManager.kt** | **Implemented** | Singleton with tick loop, receive loop, persistence |
| **TorService Integration** | **Implemented** | Auto-init on Tor ready, onion address propagation, clean shutdown |
| **MessageService Integration** | **Implemented** | AetherNet fallback when Tor delivery fails |
| **RustBridge.kt** | **Implemented** | 22 AetherNet `external fun` declarations |

### Android JNI Functions

| Function | Purpose |
|----------|---------|
| `aethernetInit` | Initialize with Ed25519 pubkey + master key |
| `aethernetStart` / `aethernetStop` | Transport lifecycle |
| `aethernetSend` | Send via smart transport selection |
| `aethernetReceive` | Receive from all transports (JSON) |
| `aethernetSetTorOnion` | Feed Tor hidden service address |
| `aethernetActivateCrisis` / `aethernetDeactivateCrisis` | Crisis mode |
| `aethernetIsCrisisActive` | Crisis status |
| `aethernetEnableSolidarity` | Opt-in relay |
| `aethernetGetStatus` | Full status JSON |
| `aethernetTick` | Periodic maintenance (~30s) |
| `aethernetPendingCount` | Store-forward queue size |
| `aethernetTrustScore` | Peer trust score (0-100) |
| `aethernetMeshPeerDiscovered` | Mesh peer found (BLE/WiFi/LoRa) |
| `aethernetMeshPeerLost` | Mesh peer lost |
| `aethernetMeshDataReceived` | Inbound mesh data |
| `aethernetMeshTakeOutbound` | Outbound mesh data (JSON) |
| `aethernetPersist` | Serialize state to encrypted bytes |
| `aethernetRestore` | Restore from encrypted bytes |

### Web App

| Component | Status | Notes |
|-----------|--------|-------|
| **AetherNet Landing Page** | **Implemented** | `/aethernet` — informational page with transport details |
| **AetherNet Dashboard** | **Implemented** | `/aethernet-dashboard` — live status, controls, metrics |
| **Sidebar Link** | **Implemented** | Globe icon in authenticated sidebar |
| **TP-Link Setup Guide** | **Implemented** | `/tplink-setup` — mesh router configuration |

### iOS

| Component | Status | Notes |
|-----------|--------|-------|
| **AetherNet FFI** | **Not started** | iOS C FFI bindings needed |
| **Swift Integration** | **Not started** | `AetherNetManager` Swift wrapper needed |

---

## Core Components

### 1. Smart Switching Engine

Selects the optimal transport based on real-time multi-factor scoring:

| Factor | Default Weight | Description |
|--------|---------------|-------------|
| Anonymity | 0.35 | How well the transport hides metadata |
| Latency | 0.25 | Round-trip time to destination |
| Reliability | 0.20 | Recent transmission success rate |
| Bandwidth | 0.10 | Available throughput |
| Battery | 0.05 | Energy cost |
| Threat | 0.05 | Adjusts weights based on crisis level |

**Switching behavior:**
- **Normal:** Prefer Tor (highest anonymity)
- **High threat:** Redundant delivery via all transports, identity rotation
- **No internet:** Automatic fallback to local mesh
- **Crisis:** All transports simultaneously, traffic padding, dummy messages

The switcher's threat level is **synchronized with the Crisis Controller** on every `tick()` and `send()` call.

### 2. Identity Vault

Per-transport Ed25519/X25519 identities with:
- **Automatic rotation** at configurable intervals (default 24h, crisis = per-message)
- **Encrypted persistence** via XChaCha20-Poly1305 with user's master key
- **Key history** for verifying messages signed with rotated keys
- **`set_rotation_interval()`** now fully functional (fixed from no-op)

### 3. Store-and-Forward Queue

When no transport is available:
- Messages queued locally, encrypted at rest
- Priority ordering (Critical > Urgent > Normal > Bulk)
- Exponential backoff retry (10s base, 1h max)
- Configurable TTL (default 1 hour)
- **Encrypted persistence** across app restarts via `persist()`/`restore()`

### 4. Crisis Mode

Activated manually or automatically via:
- Network tampering detection
- Traffic analysis detection
- Manual panic activation

**Effects:**
- All messages sent via all available transports
- Identity rotation for all transports
- Message padding to fixed size
- Dummy traffic generation
- Priority escalation for all messages

### 5. Trust Map

Local-only distributed reputation:
- Trust scores computed from: relay success/failure, vouching, penalties
- Blacklist threshold for consistently failing peers
- Used for cluster head election and relay node selection
- **Serializable** for persistence across restarts

### 6. Crowd-Adaptive Mesh

For dense environments (protests, disasters):
- Automatic cluster formation (3-12 peers)
- Head election by trust score + battery level
- Inter-cluster bridging via internet-connected nodes
- Epidemic routing for high-priority messages

### 7. Solidarity Protocol

Voluntary mutual-aid relay:
- Onion-encrypted relay (relay nodes cannot read content)
- 50 MB/day bandwidth limit
- Message dedup to prevent relay amplification

---

## Transport Comparison

| Feature | Tor | I2P | LibreMesh |
|---------|-----|-----|-----------|
| Internet Required | Yes | Yes | No |
| Anonymity Level | Very High | Very High | Medium (local) |
| Latency | ~800ms | ~1200ms | ~50ms |
| Bandwidth | Medium | High | Low-Medium |
| Censorship Resistance | High (bridges) | High (reseed) | Very High (no internet) |
| Battery Cost | Medium | Medium-High | Low-Medium |
| Best For | Chat, calls | File transfer | Offline/crisis |

---

## Message Flow

```
User sends message
        ↓
[Crisis mode active?]
    ├── Yes → Critical priority, redundant delivery
    └── No  → Normal priority
        ↓
[Smart Switcher evaluates transports]
    ├── Tor available   → score(anonymity, latency, reliability, ...)
    ├── I2P available   → score(...)
    └── Mesh available  → score(...)
        ↓
[Best transport selected (or all, if redundant)]
    ├── Tor: send via SOCKS5 to .onion hidden service
    ├── I2P: send via SAM DATAGRAM
    └── Mesh: queue outbound for platform radio
        ↓
[Delivery failed?]
    ├── Yes → Queue in store-and-forward
    │         Retry with exponential backoff
    └── No  → Update trust map (success)
```

---

## File Structure

```
shield-messenger-core/src/aethernet/
├── mod.rs              # AetherNet public API (lifecycle, send, receive, tick, persist)
├── transport.rs        # NetworkTransport trait, Envelope, Route, TransportMetrics
├── tor_transport.rs    # Tor transport (SOCKS5 via Arti)
├── i2p_transport.rs    # I2P transport (SAM v3.1)
├── mesh_transport.rs   # Mesh transport (BLE/WiFi Direct/LoRa platform bridge)
├── switcher.rs         # Smart Switching Engine (multi-factor scoring)
├── identity_vault.rs   # Per-transport identity management + encrypted vault
├── store_forward.rs    # Store-and-forward queue + encrypted persistence
├── crisis.rs           # Crisis mode controller (padding, dummy traffic)
├── trust_map.rs        # Local trust scoring + serialization
├── crowd_mesh.rs       # Crowd-adaptive mesh (clusters, epidemic routing)
└── solidarity.rs       # Solidarity relay (onion-encrypted mutual aid)

app/src/main/java/com/shieldmessenger/network/
└── AetherNetManager.kt # Android integration (singleton, tick/persist/receive loops)

web/src/pages/
├── AetherNetDashboard.tsx     # Live status dashboard (authenticated)
└── landing/AetherNetPage.tsx  # Informational landing page (public)
```

---

## Security Considerations

- **No central coordination:** All routing decisions are made locally
- **No metadata leakage:** Transport-layer identities are never correlated across networks
- **Forward secrecy:** Per-session keys for all transports
- **Relay privacy:** Onion encryption ensures relay nodes cannot read content
- **Trust is local:** Trust maps never leave the device
- **Plausible deniability:** Dummy traffic and fixed-size padding in crisis mode
- **Encrypted persistence:** Store-forward queue and trust map encrypted with master key

---

## Next Steps

### Short-term
- [ ] iOS AetherNet FFI bindings (`sl_aethernet_*` in `ios.rs`)
- [ ] BLE/Wi-Fi Direct platform integration on Android (NearbyConnections API)
- [ ] WASM bridge for web dashboard live updates (WebSocket → AetherNet status)
- [ ] I2P router bundling for Android (i2pd or SAM bridge discovery)

### Medium-term
- [ ] LoRa hardware integration (Meshtastic protocol bridge)
- [ ] Federated learning for route optimization (on-device only)
- [ ] Battery-aware transport scheduling
- [ ] Traffic analysis countermeasures (cover traffic patterns)

### Long-term
- [ ] Satellite relay integration (for disaster zones)
- [ ] Network ML: adaptive routing from behavioral patterns
- [ ] Incentive layer: solidarity credits and community reputation
