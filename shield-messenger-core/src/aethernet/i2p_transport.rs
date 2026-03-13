//! I2P Transport — Garlic-routed transport via the I2P SAM bridge.
//!
//! Connects to a local I2P router's SAM (Simple Anonymous Messaging) protocol
//! for garlic-routed, end-to-end encrypted message delivery.
//! Optimized for bulk transfers and high-bandwidth scenarios.

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use log::{debug, info, warn};

use super::transport::*;

/// I2P SAM protocol version.
const SAM_VERSION: &str = "3.1";
/// Default SAM bridge address.
const DEFAULT_SAM_ADDR: &str = "127.0.0.1:7656";
/// Session style for datagram messaging.
const SESSION_STYLE: &str = "DATAGRAM";

/// I2P Transport implementation for AetherNet.
///
/// Uses the SAM v3.1 protocol to communicate with a local I2P router.
/// The I2P router handles all tunnel management, garlic routing, and
/// network-level encryption.
pub struct I2PTransport {
    /// SAM bridge address.
    sam_addr: String,
    /// SAM session ID.
    session_id: Mutex<Option<String>>,
    /// Local I2P destination (base64).
    local_destination: Mutex<Option<String>>,
    /// Known peers: Ed25519 pubkey → I2P destination.
    peers: Mutex<HashMap<[u8; 32], PeerAddress>>,
    /// Inbound message queue.
    inbox: Mutex<Vec<Envelope>>,
    /// SAM control socket.
    control_socket: Mutex<Option<TcpStream>>,
    /// Whether started.
    started: AtomicBool,
    /// Whether connected to SAM.
    connected: AtomicBool,
    /// Metrics.
    messages_sent: AtomicU64,
    messages_delivered: AtomicU64,
    latency_sum_ms: AtomicU64,
    latency_count: AtomicU64,
}

impl I2PTransport {
    pub fn new(sam_addr: Option<&str>) -> Self {
        Self {
            sam_addr: sam_addr.unwrap_or(DEFAULT_SAM_ADDR).to_string(),
            session_id: Mutex::new(None),
            local_destination: Mutex::new(None),
            peers: Mutex::new(HashMap::new()),
            inbox: Mutex::new(Vec::new()),
            control_socket: Mutex::new(None),
            started: AtomicBool::new(false),
            connected: AtomicBool::new(false),
            messages_sent: AtomicU64::new(0),
            messages_delivered: AtomicU64::new(0),
            latency_sum_ms: AtomicU64::new(0),
            latency_count: AtomicU64::new(0),
        }
    }

    /// Queue an inbound envelope from the SAM datagram listener.
    pub fn queue_inbound(&self, envelope: Envelope) {
        if let Ok(mut inbox) = self.inbox.lock() {
            inbox.push(envelope);
        }
    }

    /// Perform SAM handshake and create a session.
    fn sam_handshake(&self) -> TransportResult<()> {
        let stream = TcpStream::connect(&self.sam_addr)
            .map_err(|e| TransportError::ConnectionFailed(format!("SAM connect: {}", e)))?;
        stream.set_read_timeout(Some(Duration::from_secs(10))).ok();

        let mut stream_clone = stream
            .try_clone()
            .map_err(|e| TransportError::Internal(format!("clone: {}", e)))?;

        // HELLO
        let hello = format!("HELLO VERSION MIN={} MAX={}\n", SAM_VERSION, SAM_VERSION);
        stream_clone
            .write_all(hello.as_bytes())
            .map_err(|e| TransportError::ConnectionFailed(format!("SAM hello write: {}", e)))?;

        let mut reader = BufReader::new(&stream);
        let mut response = String::new();
        reader
            .read_line(&mut response)
            .map_err(|e| TransportError::ConnectionFailed(format!("SAM hello read: {}", e)))?;

        if !response.contains("RESULT=OK") {
            return Err(TransportError::ConnectionFailed(format!(
                "SAM hello rejected: {}",
                response.trim()
            )));
        }

        // SESSION CREATE
        let session_id = uuid::Uuid::new_v4().to_string();
        let create = format!(
            "SESSION CREATE STYLE={} ID={} DESTINATION=TRANSIENT\n",
            SESSION_STYLE, session_id
        );
        stream_clone
            .write_all(create.as_bytes())
            .map_err(|e| TransportError::ConnectionFailed(format!("SAM session write: {}", e)))?;

        response.clear();
        reader
            .read_line(&mut response)
            .map_err(|e| TransportError::ConnectionFailed(format!("SAM session read: {}", e)))?;

        if !response.contains("RESULT=OK") {
            return Err(TransportError::ConnectionFailed(format!(
                "SAM session create failed: {}",
                response.trim()
            )));
        }

        // Extract destination from response
        let dest = extract_sam_value(&response, "DESTINATION");

        if let Ok(mut sid) = self.session_id.lock() {
            *sid = Some(session_id);
        }
        if let Ok(mut ld) = self.local_destination.lock() {
            *ld = dest;
        }
        if let Ok(mut cs) = self.control_socket.lock() {
            *cs = Some(stream_clone);
        }

        self.connected.store(true, Ordering::SeqCst);
        info!("[AetherNet/I2P] SAM session created successfully");
        Ok(())
    }

    fn avg_latency_ms(&self) -> u64 {
        let count = self.latency_count.load(Ordering::Relaxed);
        if count == 0 {
            return 600; // I2P typical
        }
        self.latency_sum_ms.load(Ordering::Relaxed) / count
    }
}

/// Extract a value from a SAM response line like "SESSION STATUS RESULT=OK DESTINATION=xxx"
fn extract_sam_value(response: &str, key: &str) -> Option<String> {
    let prefix = format!("{}=", key);
    response.split_whitespace().find_map(|part| {
        if part.starts_with(&prefix) {
            Some(part[prefix.len()..].to_string())
        } else {
            None
        }
    })
}

impl NetworkTransport for I2PTransport {
    fn transport_type(&self) -> TransportType {
        TransportType::I2P
    }

    fn start(&self) -> TransportResult<()> {
        self.started.store(true, Ordering::SeqCst);
        info!(
            "[AetherNet/I2P] Transport starting, connecting to SAM at {}",
            self.sam_addr
        );

        match self.sam_handshake() {
            Ok(()) => {
                info!("[AetherNet/I2P] Connected to I2P router");
                Ok(())
            }
            Err(e) => {
                warn!(
                    "[AetherNet/I2P] SAM not available ({}), will retry on demand",
                    e
                );
                // Don't fail start — I2P may become available later
                Ok(())
            }
        }
    }

    fn stop(&self) -> TransportResult<()> {
        self.started.store(false, Ordering::SeqCst);
        self.connected.store(false, Ordering::SeqCst);
        if let Ok(mut cs) = self.control_socket.lock() {
            *cs = None;
        }
        info!("[AetherNet/I2P] Transport stopped");
        Ok(())
    }

    fn is_available(&self) -> bool {
        self.started.load(Ordering::Relaxed) && self.connected.load(Ordering::Relaxed)
    }

    fn send(&self, envelope: &Envelope, route: &Route) -> TransportResult<()> {
        if !self.is_available() {
            // Try to reconnect
            if self.started.load(Ordering::Relaxed) {
                let _ = self.sam_handshake();
            }
            if !self.is_available() {
                return Err(TransportError::Unavailable("I2P not connected".into()));
            }
        }

        let dest = &route.destination.transport_addr;
        if dest.is_empty() {
            return Err(TransportError::PeerNotFound("no I2P destination".into()));
        }

        let start = Instant::now();

        let session_id = self
            .session_id
            .lock()
            .map_err(|_| TransportError::Internal("lock".into()))?
            .clone()
            .ok_or_else(|| TransportError::Unavailable("no session".into()))?;

        // Serialize envelope
        let payload = bincode::serialize(envelope)
            .map_err(|e| TransportError::SendFailed(format!("serialize: {}", e)))?;

        // Open a data connection to SAM for sending
        let data_stream = TcpStream::connect(&self.sam_addr)
            .map_err(|e| TransportError::SendFailed(format!("data connect: {}", e)))?;
        data_stream
            .set_write_timeout(Some(Duration::from_secs(30)))
            .ok();

        let mut data_stream = data_stream;

        // SAM DATAGRAM SEND
        let header = format!(
            "DATAGRAM SEND ID={} DESTINATION={} SIZE={}\n",
            session_id,
            dest,
            payload.len()
        );
        data_stream
            .write_all(header.as_bytes())
            .map_err(|e| TransportError::SendFailed(format!("header write: {}", e)))?;
        data_stream
            .write_all(&payload)
            .map_err(|e| TransportError::SendFailed(format!("payload write: {}", e)))?;

        let elapsed = start.elapsed();
        self.messages_sent.fetch_add(1, Ordering::Relaxed);
        self.messages_delivered.fetch_add(1, Ordering::Relaxed);
        self.latency_sum_ms
            .fetch_add(elapsed.as_millis() as u64, Ordering::Relaxed);
        self.latency_count.fetch_add(1, Ordering::Relaxed);

        debug!(
            "[AetherNet/I2P] Sent envelope {} via garlic routing in {:?}",
            envelope.id, elapsed
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
        self.local_destination
            .lock()
            .map_err(|_| TransportError::Internal("lock".into()))?
            .clone()
            .ok_or_else(|| TransportError::Unavailable("no I2P destination".into()))
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
            transport_type: TransportType::I2P,
            available: self.is_available(),
            latency: Duration::from_millis(self.avg_latency_ms()),
            bandwidth_bps: 1_000_000, // I2P typically higher throughput than Tor
            reliability,
            anonymity_score: 0.90, // Garlic routing slightly less studied than Tor
            battery_cost: 0.5,
            active_connections: if self.is_available() { 1 } else { 0 },
            messages_sent: sent,
            messages_delivered: delivered,
            last_updated: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        }
    }

    fn resolve_peer(&self, pubkey: &[u8; 32]) -> TransportResult<PeerAddress> {
        self.peers
            .lock()
            .map_err(|_| TransportError::Internal("lock".into()))?
            .get(pubkey)
            .cloned()
            .ok_or_else(|| TransportError::PeerNotFound("unknown I2P peer".into()))
    }

    fn register_peer(&self, address: PeerAddress) -> TransportResult<()> {
        self.peers
            .lock()
            .map_err(|_| TransportError::Internal("lock".into()))?
            .insert(address.public_key, address);
        Ok(())
    }

    fn peer_latency(&self, pubkey: &[u8; 32]) -> Option<Duration> {
        if self.peers.lock().ok()?.contains_key(pubkey) {
            Some(Duration::from_millis(self.avg_latency_ms()))
        } else {
            None
        }
    }
}
