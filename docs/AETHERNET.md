# AetherNet — Decentralized Mesh Networking for Shield Messenger

## Overview

AetherNet is Shield Messenger's next-generation networking layer that combines multiple privacy networks into a unified, intelligent mesh. It dynamically switches between Tor, I2P, and LibreMesh based on network conditions, threat level, and connectivity availability — ensuring messages always reach their destination through the most secure and efficient path possible.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Shield Messenger App Layer                   │
├─────────────────────────────────────────────────────────────────┤
│                  AetherNet Abstraction Layer                    │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Transport  │  │   Identity   │  │    Decision Engine       │ │
│  │  Manager   │  │    Vault     │  │  (Smart Route Selector)  │ │
│  └─────┬─────┘  └──────┬───────┘  └────────────┬─────────────┘ │
├────────┼────────────────┼──────────────────────┼────────────────┤
│        │                │                      │                │
│   ┌────▼────┐    ┌──────▼──────┐    ┌──────────▼──────────┐    │
│   │   Tor   │    │     I2P     │    │     LibreMesh       │    │
│   │ Circuit │    │   Tunnel    │    │   (LoRa / Wi-Fi)    │    │
│   └─────────┘    └─────────────┘    └─────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│               Store-and-Forward Queue                          │
│               Crisis Mode Controller                           │
│               Trust Map Engine                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Network Abstraction Layer (NAL)

A unified API that hides the complexity of underlying transports. All message routing goes through NAL, which exposes a single `send(message, priority, constraints)` interface.

```
trait NetworkTransport {
    fn send(&self, payload: &[u8], route: &Route) -> Result<()>;
    fn receive(&self) -> Result<Vec<u8>>;
    fn latency(&self) -> Duration;
    fn bandwidth(&self) -> u64;
    fn anonymity_score(&self) -> f64;   // 0.0 – 1.0
    fn availability(&self) -> bool;
}
```

**Implementations:**
- `TorTransport` — Onion-routed circuits via Tor hidden services (current default)
- `I2PTransport` — Garlic-routed tunnels via I2P network
- `LibreMeshTransport` — Local mesh via Wi-Fi Direct, Bluetooth LE, or LoRa radio

### 2. Smart Switching Engine

The decision engine selects the optimal transport based on real-time scoring:

| Factor | Weight | Description |
|--------|--------|-------------|
| Anonymity | 0.35 | How well the transport hides sender/receiver identity |
| Latency | 0.20 | Round-trip time to destination |
| Reliability | 0.20 | Success rate of recent transmissions |
| Bandwidth | 0.10 | Available throughput |
| Battery | 0.10 | Energy cost of the transport |
| Threat Level | 0.05 | Adjusts weights based on security context |

**Switching Rules:**
- **Normal mode:** Prefer Tor for internet-connected messaging, I2P for file transfers
- **High-threat mode:** Force Tor with multi-hop circuits, rotate identities
- **No-internet mode:** Fall back to LibreMesh peer-to-peer
- **Crisis mode:** Use all available transports simultaneously with redundant delivery

### 3. Identity Vault

Manages per-network cryptographic identities:

- **Tor:** Ephemeral `.onion` addresses per session, long-term hidden service keys
- **I2P:** Destination keys with lease sets, tunnel keys
- **LibreMesh:** Device-specific Ed25519 keypairs for mesh authentication

All identities are stored in the encrypted local vault (AES-256-GCM), derived from the user's master key. Identity rotation happens automatically based on configurable intervals.

### 4. Store-and-Forward Queue

When no transport is available, messages are queued locally with the following guarantees:

- Messages are encrypted at rest with the recipient's public key
- Queue is ordered by priority (urgent > normal > bulk)
- Automatic retry with exponential backoff when connectivity returns
- Messages expire after configurable TTL (default: 7 days)
- Queue syncs across mesh peers for redundant delivery

### 5. Crisis Mode

Activated manually or automatically when threat indicators are detected:

**Triggers:**
- User manual activation (panic button)
- Network anomaly detection (sudden connectivity drop, unusual latency patterns)
- Geographic trigger zones (configurable)

**Behavior:**
- All messages sent via all available transports simultaneously
- Message size padded to fixed length to prevent traffic analysis
- Dummy traffic generated to mask real communication patterns
- Auto-destruction timers shortened
- Identity rotation frequency increased to per-message

### 6. Trust Map

A distributed reputation system for mesh nodes:

```
struct TrustScore {
    node_id: PublicKey,
    reliability: f64,      // Message delivery success rate
    latency_avg: Duration, // Average forwarding latency
    uptime: f64,           // Time this node has been available
    vouched_by: Vec<PublicKey>, // Nodes that vouch for this node
    penalty_count: u32,    // Times this node failed or misbehaved
    score: f64,            // Computed trust score 0.0 – 1.0
}
```

Trust scores are computed locally — never shared over the network. Each device maintains its own trust map based on observed behavior. Nodes with low trust scores are deprioritized for routing.

### 7. Crowd-Adaptive Mesh

In dense environments (protests, events, disaster zones), AetherNet automatically:

- Discovers nearby Shield Messenger users via BLE beacons
- Forms ad-hoc mesh clusters with automatic relay selection
- Elects cluster heads based on trust scores and battery level
- Bridges between mesh clusters when internet-connected nodes are available
- Implements epidemic routing for high-priority messages

### 8. Solidarity Protocol

A mutual-aid networking layer:

- Nodes voluntarily relay messages for other users
- Relay participation earns "solidarity credits" (local reputation only, not cryptocurrency)
- Credits are used to prioritize your messages when you need relay assistance
- Opt-in only — users choose their relay bandwidth contribution
- Relayed messages are onion-encrypted so relay nodes cannot read content

---

## Transport Comparison

| Feature | Tor | I2P | LibreMesh |
|---------|-----|-----|-----------|
| Internet Required | Yes | Yes | No |
| Anonymity Level | Very High | Very High | Medium (local) |
| Latency | Medium-High | Medium | Low |
| Bandwidth | Medium | High | Low-Medium |
| Censorship Resistance | High (bridges) | High (reseed) | Very High (no internet) |
| Battery Cost | Medium | Medium-High | Low-Medium |
| Best For | Chat, calls | File transfer | Offline/crisis |

---

## Implementation Phases

### Phase 1: Foundation (Current)
- [x] Tor integration (hidden services for messaging and voice)
- [x] E2EE over Tor with hybrid encryption (X25519 + ML-KEM-1024)
- [ ] Network abstraction layer design
- [ ] Transport trait definition in Rust core

### Phase 2: I2P Integration
- [ ] I2P tunnel management in Rust
- [ ] Garlic routing for message bundles
- [ ] I2P destination management in Identity Vault
- [ ] Smart switching between Tor and I2P
- [ ] Latency/bandwidth measurement infrastructure

### Phase 3: LibreMesh (Offline Mesh)
- [ ] BLE beacon discovery for nearby devices
- [ ] Wi-Fi Direct mesh formation
- [ ] LoRa integration for long-range low-bandwidth
- [ ] Store-and-forward queue implementation
- [ ] Epidemic routing for mesh clusters

### Phase 4: Intelligence Layer
- [ ] Smart Switching Engine with real-time scoring
- [ ] Trust Map computation and storage
- [ ] Crisis Mode controller
- [ ] Crowd-Adaptive Mesh cluster management
- [ ] Solidarity Protocol relay system

### Phase 5: Optimization
- [ ] Federated learning for route optimization (on-device only)
- [ ] Battery-aware transport scheduling
- [ ] Adaptive message compression
- [ ] Traffic analysis countermeasures

---

## Security Considerations

- **No central coordination:** All routing decisions are made locally on each device
- **No metadata leakage:** Transport-layer identities are never correlated across networks
- **Forward secrecy:** Per-session keys for all transports
- **Relay privacy:** Onion encryption ensures relay nodes cannot read content or know both sender and recipient
- **Trust is local:** Trust maps never leave the device; no global reputation system that could be gamed
- **Plausible deniability:** Dummy traffic and fixed-size padding prevent traffic analysis

---

## File Structure (Planned)

```
shield-messenger-core/src/
├── aethernet/
│   ├── mod.rs              # AetherNet public API
│   ├── transport.rs        # NetworkTransport trait
│   ├── tor_transport.rs    # Tor implementation (existing, refactored)
│   ├── i2p_transport.rs    # I2P implementation
│   ├── mesh_transport.rs   # LibreMesh implementation
│   ├── switcher.rs         # Smart Switching Engine
│   ├── identity_vault.rs   # Per-network identity management
│   ├── store_forward.rs    # Store-and-forward queue
│   ├── crisis.rs           # Crisis mode controller
│   ├── trust_map.rs        # Local trust scoring
│   ├── crowd_mesh.rs       # Crowd-adaptive mesh clustering
│   └── solidarity.rs       # Solidarity relay protocol
```
