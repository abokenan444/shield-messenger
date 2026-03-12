//! Mesh Transport — Local peer-to-peer networking via BLE, Wi-Fi Direct, or LoRa.
//!
//! Provides offline-capable communication for crisis scenarios.
//! The actual radio/BLE/Wi-Fi layers are handled by the platform (Android/iOS);
//! this module manages the mesh protocol, peer tracking, and routing.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use log::{debug, info, warn};

use super::transport::*;

/// Maximum mesh packet size (BLE MTU-safe).
const MESH_MAX_PACKET: usize = 512;
/// Beacon broadcast interval.
const BEACON_INTERVAL: Duration = Duration::from_secs(30);
/// Peer timeout: consider lost after this duration without a beacon.
const PEER_TIMEOUT: Duration = Duration::from_secs(120);

/// Mesh radio type.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MeshRadio {
    /// Bluetooth Low Energy — short range (~30m), low power.
    Ble,
    /// Wi-Fi Direct — medium range (~100m), high bandwidth.
    WifiDirect,
    /// LoRa — long range (~5km), very low bandwidth.
    LoRa,
}

/// A discovered mesh peer.
#[derive(Debug, Clone)]
pub struct MeshPeer {
    /// Peer's Ed25519 public key.
    pub pubkey: [u8; 32],
    /// Platform-specific address (BLE MAC, Wi-Fi Direct group, LoRa node ID).
    pub radio_addr: String,
    /// Which radio this peer was discovered on.
    pub radio: MeshRadio,
    /// Signal strength (RSSI or equivalent, dBm).
    pub signal_strength: i16,
    /// Last time we heard from this peer.
    pub last_seen: Instant,
    /// Whether this peer has internet connectivity (can bridge).
    pub has_internet: bool,
    /// Battery level (0-100), if known.
    pub battery_level: Option<u8>,
}

impl MeshPeer {
    pub fn is_alive(&self) -> bool {
        self.last_seen.elapsed() < PEER_TIMEOUT
    }
}

/// Mesh Transport implementation for AetherNet.
///
/// The actual radio operations (BLE scanning, Wi-Fi Direct discovery, LoRa TX/RX)
/// are performed by the platform layer (Android BLE API, iOS CoreBluetooth, etc.).
/// This module provides the protocol logic: peer management, message routing,
/// fragmentation, and epidemic delivery.
pub struct MeshTransport {
    /// Discovered mesh peers.
    peers: Mutex<HashMap<[u8; 32], MeshPeer>>,
    /// Registered peer addresses for the NetworkTransport trait.
    peer_addresses: Mutex<HashMap<[u8; 32], PeerAddress>>,
    /// Outbound queue: messages waiting to be sent via platform radio.
    outbox: Mutex<Vec<MeshOutbound>>,
    /// Inbound message queue.
    inbox: Mutex<Vec<Envelope>>,
    /// Our public key (set during init).
    local_pubkey: Mutex<Option<[u8; 32]>>,
    /// Whether started.
    started: AtomicBool,
    /// Number of active mesh peers.
    active_peers: AtomicU32,
    /// Metrics.
    messages_sent: AtomicU64,
    messages_delivered: AtomicU64,
}

/// An outbound message waiting to be sent via mesh radio.
#[derive(Debug, Clone)]
pub struct MeshOutbound {
    /// Serialized envelope data (may be fragmented).
    pub data: Vec<u8>,
    /// Target peer pubkey (or broadcast).
    pub target: Option<[u8; 32]>,
    /// Priority.
    pub priority: MessagePriority,
    /// Creation time.
    pub created: Instant,
    /// Number of send attempts.
    pub attempts: u32,
}

impl MeshTransport {
    pub fn new() -> Self {
        Self {
            peers: Mutex::new(HashMap::new()),
            peer_addresses: Mutex::new(HashMap::new()),
            outbox: Mutex::new(Vec::new()),
            inbox: Mutex::new(Vec::new()),
            local_pubkey: Mutex::new(None),
            started: AtomicBool::new(false),
            active_peers: AtomicU32::new(0),
            messages_sent: AtomicU64::new(0),
            messages_delivered: AtomicU64::new(0),
        }
    }

    /// Set our local public key.
    pub fn set_local_pubkey(&self, pubkey: [u8; 32]) {
        if let Ok(mut pk) = self.local_pubkey.lock() {
            *pk = Some(pubkey);
        }
    }

    /// Called by platform when a mesh peer is discovered via BLE/Wi-Fi/LoRa beacon.
    pub fn on_peer_discovered(
        &self,
        pubkey: [u8; 32],
        radio_addr: String,
        radio: MeshRadio,
        signal_strength: i16,
        has_internet: bool,
        battery_level: Option<u8>,
    ) {
        let peer = MeshPeer {
            pubkey,
            radio_addr: radio_addr.clone(),
            radio,
            signal_strength,
            last_seen: Instant::now(),
            has_internet,
            battery_level,
        };

        if let Ok(mut peers) = self.peers.lock() {
            let is_new = !peers.contains_key(&pubkey);
            peers.insert(pubkey, peer);
            let alive_count = peers.values().filter(|p| p.is_alive()).count();
            self.active_peers.store(alive_count as u32, Ordering::Relaxed);

            if is_new {
                info!(
                    "[AetherNet/Mesh] New peer discovered via {:?}: {} (signal: {} dBm)",
                    radio,
                    hex::encode(&pubkey[..8]),
                    signal_strength
                );
            }
        }

        // Also register in the PeerAddress map
        let addr = PeerAddress {
            public_key: pubkey,
            transport_addr: radio_addr,
            transport_type: TransportType::Mesh,
        };
        if let Ok(mut pa) = self.peer_addresses.lock() {
            pa.insert(pubkey, addr);
        }
    }

    /// Called by platform when a mesh peer is lost.
    pub fn on_peer_lost(&self, pubkey: &[u8; 32]) {
        if let Ok(mut peers) = self.peers.lock() {
            peers.remove(pubkey);
            let alive_count = peers.values().filter(|p| p.is_alive()).count();
            self.active_peers.store(alive_count as u32, Ordering::Relaxed);
        }
    }

    /// Called by platform when mesh data is received from a peer.
    pub fn on_data_received(&self, data: &[u8]) {
        match bincode::deserialize::<Envelope>(data) {
            Ok(envelope) => {
                if !envelope.is_expired() {
                    if let Ok(mut inbox) = self.inbox.lock() {
                        inbox.push(envelope);
                    }
                }
            }
            Err(e) => {
                warn!("[AetherNet/Mesh] Failed to deserialize received data: {}", e);
            }
        }
    }

    /// Get the next outbound message for the platform to send.
    pub fn take_outbound(&self) -> Option<MeshOutbound> {
        if let Ok(mut outbox) = self.outbox.lock() {
            if outbox.is_empty() {
                return None;
            }
            // Sort by priority (highest first)
            outbox.sort_by(|a, b| b.priority.cmp(&a.priority));
            Some(outbox.remove(0))
        } else {
            None
        }
    }

    /// Get all currently alive peers.
    pub fn alive_peers(&self) -> Vec<MeshPeer> {
        self.peers
            .lock()
            .map(|p| p.values().filter(|peer| peer.is_alive()).cloned().collect())
            .unwrap_or_default()
    }

    /// Find the best bridge peer (one with internet connectivity).
    pub fn find_bridge_peer(&self) -> Option<MeshPeer> {
        self.peers.lock().ok().and_then(|p| {
            p.values()
                .filter(|peer| peer.is_alive() && peer.has_internet)
                .max_by_key(|peer| peer.signal_strength)
                .cloned()
        })
    }

    /// Clean up expired peers.
    pub fn cleanup_peers(&self) {
        if let Ok(mut peers) = self.peers.lock() {
            peers.retain(|_, peer| peer.is_alive());
            self.active_peers
                .store(peers.len() as u32, Ordering::Relaxed);
        }
    }
}

impl NetworkTransport for MeshTransport {
    fn transport_type(&self) -> TransportType {
        TransportType::Mesh
    }

    fn start(&self) -> TransportResult<()> {
        self.started.store(true, Ordering::SeqCst);
        info!("[AetherNet/Mesh] Transport started, waiting for peer discovery");
        Ok(())
    }

    fn stop(&self) -> TransportResult<()> {
        self.started.store(false, Ordering::SeqCst);
        if let Ok(mut outbox) = self.outbox.lock() {
            outbox.clear();
        }
        info!("[AetherNet/Mesh] Transport stopped");
        Ok(())
    }

    fn is_available(&self) -> bool {
        self.started.load(Ordering::Relaxed) && self.active_peers.load(Ordering::Relaxed) > 0
    }

    fn send(&self, envelope: &Envelope, route: &Route) -> TransportResult<()> {
        if !self.started.load(Ordering::Relaxed) {
            return Err(TransportError::Unavailable("Mesh not started".into()));
        }

        let payload = bincode::serialize(envelope)
            .map_err(|e| TransportError::SendFailed(format!("serialize: {}", e)))?;

        let target_pubkey = if route.destination.transport_addr.is_empty() {
            // Broadcast to all mesh peers (epidemic routing)
            None
        } else {
            Some(route.destination.public_key)
        };

        let outbound = MeshOutbound {
            data: payload,
            target: target_pubkey,
            priority: envelope.priority,
            created: Instant::now(),
            attempts: 0,
        };

        if let Ok(mut outbox) = self.outbox.lock() {
            outbox.push(outbound);
        }

        self.messages_sent.fetch_add(1, Ordering::Relaxed);
        // Delivery confirmation comes later via epidemic ACK
        debug!(
            "[AetherNet/Mesh] Queued envelope {} for mesh delivery",
            envelope.id
        );
        Ok(())
    }

    fn receive(&self, max_count: usize) -> TransportResult<Vec<Envelope>> {
        if let Ok(mut inbox) = self.inbox.lock() {
            let count = max_count.min(inbox.len());
            Ok(inbox.drain(..count).collect())
        } else {
            Ok(Vec::new())
        }
    }

    fn local_address(&self) -> TransportResult<String> {
        self.local_pubkey
            .lock()
            .map_err(|_| TransportError::Internal("lock".into()))?
            .map(|pk| hex::encode(pk))
            .ok_or_else(|| TransportError::Unavailable("no local pubkey set".into()))
    }

    fn metrics(&self) -> TransportMetrics {
        let sent = self.messages_sent.load(Ordering::Relaxed);
        let delivered = self.messages_delivered.load(Ordering::Relaxed);
        let reliability = if sent > 0 {
            delivered as f64 / sent as f64
        } else {
            0.0
        };

        TransportMetrics {
            transport_type: TransportType::Mesh,
            available: self.is_available(),
            latency: Duration::from_millis(50), // Local mesh is fast
            bandwidth_bps: 100_000,             // ~100 KB/s (BLE/Wi-Fi mix)
            reliability,
            anonymity_score: 0.3, // Local mesh leaks proximity
            battery_cost: 0.3,    // BLE is efficient
            active_connections: self.active_peers.load(Ordering::Relaxed),
            messages_sent: sent,
            messages_delivered: delivered,
            last_updated: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        }
    }

    fn resolve_peer(&self, pubkey: &[u8; 32]) -> TransportResult<PeerAddress> {
        self.peer_addresses
            .lock()
            .map_err(|_| TransportError::Internal("lock".into()))?
            .get(pubkey)
            .cloned()
            .ok_or_else(|| TransportError::PeerNotFound("unknown mesh peer".into()))
    }

    fn register_peer(&self, address: PeerAddress) -> TransportResult<()> {
        self.peer_addresses
            .lock()
            .map_err(|_| TransportError::Internal("lock".into()))?
            .insert(address.public_key, address);
        Ok(())
    }

    fn peer_latency(&self, pubkey: &[u8; 32]) -> Option<Duration> {
        self.peers.lock().ok().and_then(|peers| {
            peers.get(pubkey).and_then(|peer| {
                if peer.is_alive() {
                    // Estimate latency from signal strength
                    let base_ms = match peer.radio {
                        MeshRadio::Ble => 20,
                        MeshRadio::WifiDirect => 10,
                        MeshRadio::LoRa => 200,
                    };
                    Some(Duration::from_millis(base_ms))
                } else {
                    None
                }
            })
        })
    }
}
