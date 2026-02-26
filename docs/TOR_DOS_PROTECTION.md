# Tor Hidden Service DoS Protection

Shield Messenger implements a multi-layered defense against Denial-of-Service attacks targeting its Tor hidden services. This document describes the architecture, configuration, and deployment of these protections.

## Defense Layers

### Layer 1: OS-Level (iptables/nftables)

The first line of defense operates at the kernel level, dropping malicious packets before they reach the Tor process.

**Features:**
- SYN flood protection with rate limiting
- Invalid packet dropping (XMAS, NULL scans)
- ICMP flood prevention
- Per-port connection rate limiting
- Logging of dropped packets (rate-limited to prevent log flooding)

**Deployment:**

```bash
# Generate iptables rules
cargo run --example generate_iptables -- --socks-port 9050 --hs-port 443 --syn-rate 100

# Or use the pre-generated script
sudo bash deploy/iptables-shield.sh
```

### Layer 2: Tor-Level (torrc Configuration)

Tor's built-in DoS defenses protect at the introduction point and rendezvous level.

**Features:**
- `HiddenServiceEnableIntroDoSDefense` — Rate limits introduction cells
- `HiddenServicePoWDefensesEnabled` — Requires Proof-of-Work from clients under load (Tor 0.4.8+)
- `DoSCircuitCreationEnabled` — Limits circuit creation rate
- `DoSConnectionEnabled` — Caps concurrent connections

**Configuration:**

Add the generated snippet to your `torrc`:

```
HiddenServiceEnableIntroDoSDefense 1
HiddenServiceEnableIntroDoSRatePerSec 50
HiddenServiceEnableIntroDoSBurstPerSec 100
HiddenServicePoWDefensesEnabled 1
HiddenServicePoWQueueRate 25
HiddenServicePoWQueueBurst 50
DoSCircuitCreationEnabled 1
DoSCircuitCreationMinConnections 5
DoSCircuitCreationRate 10
DoSCircuitCreationBurst 20
DoSCircuitCreationDefenseType 2
DoSConnectionEnabled 1
DoSConnectionMaxConcurrentCount 200
DoSConnectionDefenseType 2
DoSRefuseSingleHopClientRendezvous 1
```

### Layer 3: Application-Level (Rust)

The `tor_dos_protection` module provides fine-grained, application-level rate limiting with circuit-aware tracking.

**Features:**
- Per-circuit connection rate limiting (sliding window)
- Global connection rate limiting
- Concurrent connection cap
- Automatic circuit banning after repeated violations
- Proof-of-Work challenge system (SHA3-256)
- Background cleanup of expired bans
- Real-time statistics for monitoring

**Usage:**

```rust
use securelegion::network::tor_dos_protection::{HsDoSProtection, HsDoSConfig};

let config = HsDoSConfig {
    max_connections_per_second: 50,
    max_concurrent_connections: 200,
    max_per_circuit_per_minute: 10,
    ban_duration: Duration::from_secs(300),
    ban_threshold: 5,
    pow_activation_threshold: 0.75,
    pow_difficulty: 16,
    ..Default::default()
};

let protection = HsDoSProtection::new(config);

// For each incoming connection:
match protection.evaluate_connection(circuit_id).await {
    ConnectionDecision::Allow => { /* proceed */ },
    ConnectionDecision::RequirePoW { difficulty, challenge } => { /* send PoW challenge */ },
    ConnectionDecision::RateLimited { retry_after_secs } => { /* reject with retry hint */ },
    ConnectionDecision::Banned { remaining_secs } => { /* reject */ },
    ConnectionDecision::CapacityExceeded => { /* reject */ },
}
```

### Layer 4: Arti Integration

When using the Arti (pure Rust Tor) manager, DoS protection is automatically integrated:

```rust
use securelegion::network::arti::{ArtiTorManager, ArtiConfig};

let config = ArtiConfig {
    dos_protection_enabled: true,
    dos_config: HsDoSConfig::default(),
    ..Default::default()
};

let manager = ArtiTorManager::new(config);
manager.bootstrap().await?;

// DoS protection is automatically applied to incoming connections
let decision = manager.evaluate_incoming_connection(circuit_id).await?;
```

## Proof-of-Work System

Under high load, Shield Messenger can require connecting clients to solve a computational puzzle before their connection is accepted. This makes large-scale DoS attacks economically expensive.

**Algorithm:** SHA3-256 with adjustable difficulty (leading zero bits)

```
hash = SHA3-256(challenge || nonce)
valid if: leading_zero_bits(hash) >= difficulty
```

**Difficulty levels:**
| Level | Bits | Approx. Time (modern CPU) | Use Case |
|-------|------|--------------------------|----------|
| 8     | 8    | < 1ms                    | Light load |
| 16    | 16   | ~10ms                    | Moderate load |
| 20    | 20   | ~100ms                   | Heavy load |
| 24    | 24   | ~1s                      | Under attack |

## Circuit Health Monitoring

The Arti manager includes automatic circuit health monitoring:

- **Max circuit age:** Circuits older than 10 minutes are automatically rotated
- **Latency monitoring:** Circuits with > 10s latency are marked unhealthy and rotated
- **Metrics tracking:** Bytes sent/received and latency (exponential moving average)

## Configuration Reference

| Parameter | Default | Description |
|-----------|---------|-------------|
| `max_connections_per_second` | 50 | Global rate limit for new connections |
| `max_concurrent_connections` | 200 | Maximum simultaneous open connections |
| `max_per_circuit_per_minute` | 10 | Per-circuit rate limit |
| `ban_duration` | 300s | How long to ban abusive circuits |
| `ban_threshold` | 5 | Violations before banning |
| `pow_activation_threshold` | 0.75 | Load ratio to activate PoW (0.0-1.0) |
| `pow_difficulty` | 16 | PoW difficulty (leading zero bits) |
| `circuit_health_interval_secs` | 120 | Health check interval |
| `max_circuit_age_secs` | 600 | Max circuit age before rotation |

## Monitoring

Use the `DoSStats` struct to monitor protection status:

```rust
let stats = manager.dos_stats().await;
println!("{}", stats);
// Output: Active: 42/200 | Rate: 12/50/s | Circuits: 156 tracked, 3 banned
```

## Security Considerations

1. **Rate limits should be tuned** for your expected traffic patterns. Too aggressive limits may block legitimate users on slow Tor circuits.
2. **PoW difficulty** should be low enough that mobile clients can solve it within a few seconds.
3. **Ban duration** should be long enough to deter attackers but short enough to not permanently block legitimate users who triggered false positives.
4. **Circuit rotation** provides forward secrecy at the network layer — even if a circuit is compromised, future communications use different circuits.
