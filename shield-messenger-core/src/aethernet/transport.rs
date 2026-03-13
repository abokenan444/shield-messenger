//! AetherNet Transport Abstraction Layer
//!
//! Defines the core `NetworkTransport` trait and shared types used by all
//! transport implementations (Tor, I2P, LibreMesh).

use serde::{Deserialize, Serialize};
use serde_big_array::BigArray;
use std::fmt;
use std::time::Duration;
use thiserror::Error;

// ── Error Types ─────────────────────────────────────────────────────────────

#[derive(Error, Debug)]
pub enum TransportError {
    #[error("transport not available: {0}")]
    Unavailable(String),
    #[error("connection failed: {0}")]
    ConnectionFailed(String),
    #[error("send failed: {0}")]
    SendFailed(String),
    #[error("receive failed: {0}")]
    ReceiveFailed(String),
    #[error("timeout after {0:?}")]
    Timeout(Duration),
    #[error("identity error: {0}")]
    IdentityError(String),
    #[error("encryption error: {0}")]
    EncryptionError(String),
    #[error("transport shutting down")]
    ShuttingDown,
    #[error("peer not found: {0}")]
    PeerNotFound(String),
    #[error("capacity exceeded")]
    CapacityExceeded,
    #[error("internal error: {0}")]
    Internal(String),
}

pub type TransportResult<T> = Result<T, TransportError>;

// ── Transport Identity ──────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TransportType {
    Tor,
    I2P,
    Mesh,
}

impl fmt::Display for TransportType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TransportType::Tor => write!(f, "Tor"),
            TransportType::I2P => write!(f, "I2P"),
            TransportType::Mesh => write!(f, "Mesh"),
        }
    }
}

// ── Route & Address ─────────────────────────────────────────────────────────

/// A transport-agnostic address that can identify a peer across any network.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PeerAddress {
    /// The Ed25519 public key of the peer (universal identity).
    pub public_key: [u8; 32],
    /// Transport-specific address (e.g., .onion, I2P destination, BLE MAC).
    pub transport_addr: String,
    /// Which transport this address is for.
    pub transport_type: TransportType,
}

/// Routing information for a message.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Route {
    /// Destination peer.
    pub destination: PeerAddress,
    /// Preferred transport (None = let switcher decide).
    pub preferred_transport: Option<TransportType>,
    /// Maximum acceptable latency.
    pub max_latency: Option<Duration>,
    /// Whether to use redundant delivery (crisis mode).
    pub redundant: bool,
}

// ── Message Priority ────────────────────────────────────────────────────────

#[derive(
    Debug, Default, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize,
)]
pub enum MessagePriority {
    /// Bulk transfers, file sharing — can wait.
    Bulk = 0,
    /// Normal text messages.
    #[default]
    Normal = 1,
    /// Time-sensitive: calls, typing indicators.
    Urgent = 2,
    /// Crisis mode: life-threatening, send via ALL transports.
    Critical = 3,
}

// ── Transport Envelope ──────────────────────────────────────────────────────

/// An envelope wrapping a message for transport across AetherNet.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Envelope {
    /// Unique message ID (UUID v4).
    pub id: String,
    /// Sender's Ed25519 public key.
    pub sender_pubkey: [u8; 32],
    /// Recipient's Ed25519 public key.
    pub recipient_pubkey: [u8; 32],
    /// Encrypted payload (XChaCha20-Poly1305).
    pub ciphertext: Vec<u8>,
    /// Message priority.
    pub priority: MessagePriority,
    /// Unix timestamp (milliseconds).
    pub timestamp: u64,
    /// TTL in seconds (for store-and-forward).
    pub ttl: u64,
    /// Number of relay hops this envelope has traversed.
    pub hop_count: u8,
    /// Maximum allowed hops.
    pub max_hops: u8,
    /// Ed25519 signature over (id || sender || recipient || ciphertext_hash || timestamp).
    #[serde(with = "BigArray")]
    pub signature: [u8; 64],
}

impl Envelope {
    /// Default TTL: 7 days.
    pub const DEFAULT_TTL: u64 = 7 * 24 * 3600;
    /// Maximum hop count for relay.
    pub const MAX_HOP_COUNT: u8 = 10;

    pub fn is_expired(&self) -> bool {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let created = self.timestamp / 1000; // ms to sec
        now > created + self.ttl
    }

    pub fn can_relay(&self) -> bool {
        self.hop_count < self.max_hops && !self.is_expired()
    }
}

// ── Transport Metrics ───────────────────────────────────────────────────────

/// Real-time metrics from a transport, used by the Smart Switching Engine.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportMetrics {
    /// Which transport these metrics are for.
    pub transport_type: TransportType,
    /// Whether the transport is currently operational.
    pub available: bool,
    /// Average round-trip latency to peers.
    pub latency: Duration,
    /// Available bandwidth in bytes/second.
    pub bandwidth_bps: u64,
    /// Success rate of recent transmissions (0.0 – 1.0).
    pub reliability: f64,
    /// Anonymity score (0.0 – 1.0).
    pub anonymity_score: f64,
    /// Battery cost factor (0.0 = free, 1.0 = very expensive).
    pub battery_cost: f64,
    /// Number of active connections/circuits.
    pub active_connections: u32,
    /// Messages sent in the last measurement window.
    pub messages_sent: u64,
    /// Messages successfully delivered in the last window.
    pub messages_delivered: u64,
    /// Last time metrics were updated.
    pub last_updated: u64,
}

impl Default for TransportMetrics {
    fn default() -> Self {
        Self {
            transport_type: TransportType::Tor,
            available: false,
            latency: Duration::from_millis(500),
            bandwidth_bps: 0,
            reliability: 0.0,
            anonymity_score: 0.0,
            battery_cost: 0.5,
            active_connections: 0,
            messages_sent: 0,
            messages_delivered: 0,
            last_updated: 0,
        }
    }
}

// ── Network Transport Trait ─────────────────────────────────────────────────

/// The core trait that all AetherNet transports must implement.
///
/// Each transport (Tor, I2P, LibreMesh) provides the same interface —
/// the Smart Switching Engine chooses which to use based on real-time metrics.
pub trait NetworkTransport: Send + Sync {
    /// Returns the type of this transport.
    fn transport_type(&self) -> TransportType;

    /// Initialize and start the transport.
    fn start(&self) -> TransportResult<()>;

    /// Gracefully shut down the transport.
    fn stop(&self) -> TransportResult<()>;

    /// Check if the transport is currently available and operational.
    fn is_available(&self) -> bool;

    /// Send an envelope to a peer through this transport.
    fn send(&self, envelope: &Envelope, route: &Route) -> TransportResult<()>;

    /// Receive pending envelopes from this transport.
    /// Returns up to `max_count` envelopes. Non-blocking.
    fn receive(&self, max_count: usize) -> TransportResult<Vec<Envelope>>;

    /// Get the transport-specific address for this node.
    fn local_address(&self) -> TransportResult<String>;

    /// Get current metrics for the switching engine.
    fn metrics(&self) -> TransportMetrics;

    /// Resolve a peer's Ed25519 public key to a transport-specific address.
    fn resolve_peer(&self, pubkey: &[u8; 32]) -> TransportResult<PeerAddress>;

    /// Register a peer's address for this transport.
    fn register_peer(&self, address: PeerAddress) -> TransportResult<()>;

    /// Get estimated latency to a specific peer.
    fn peer_latency(&self, pubkey: &[u8; 32]) -> Option<Duration>;
}

// ── Delivery Receipt ────────────────────────────────────────────────────────

/// Confirmation that a message was delivered.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryReceipt {
    /// The message ID that was delivered.
    pub message_id: String,
    /// Which transport delivered it.
    pub transport_type: TransportType,
    /// Time of delivery (Unix ms).
    pub delivered_at: u64,
    /// Number of hops taken.
    pub hops: u8,
}

// ── Transport Event ─────────────────────────────────────────────────────────

/// Events emitted by transports for the upper layers.
#[derive(Debug, Clone)]
pub enum TransportEvent {
    /// Transport became available.
    Available(TransportType),
    /// Transport became unavailable.
    Unavailable(TransportType),
    /// Message received from a transport.
    MessageReceived(Envelope),
    /// Message delivery confirmed.
    Delivered(DeliveryReceipt),
    /// A new mesh peer was discovered.
    PeerDiscovered(PeerAddress),
    /// A mesh peer went offline.
    PeerLost(PeerAddress),
    /// Metrics updated for a transport.
    MetricsUpdated(TransportMetrics),
}
