//! Tor Transport — Wraps the existing TorManager for the AetherNet abstraction.
//!
//! Provides onion-routed messaging with the highest anonymity guarantees.
//! Uses the existing SOCKS5 + hidden service infrastructure.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use log::{debug, info};

use super::transport::*;
use crate::network::socks5_client::Socks5Client;
use crate::network::tor::{BOOTSTRAP_STATUS, CIRCUIT_ESTABLISHED};

/// Tor transport implementation for AetherNet.
pub struct TorTransport {
    /// SOCKS5 proxy address (typically 127.0.0.1:9050).
    socks_addr: String,
    /// Local hidden service .onion address.
    local_onion: Mutex<Option<String>>,
    /// Known peers: Ed25519 pubkey → onion address.
    peers: Mutex<HashMap<[u8; 32], PeerAddress>>,
    /// Inbound message queue.
    inbox: Mutex<Vec<Envelope>>,
    /// Metrics tracking.
    metrics: Mutex<TorMetricsState>,
    /// Whether this transport is started.
    started: Mutex<bool>,
}

struct TorMetricsState {
    messages_sent: u64,
    messages_delivered: u64,
    send_latencies: Vec<Duration>,
    last_updated: Instant,
}

impl TorTransport {
    pub fn new(socks_addr: &str) -> Self {
        Self {
            socks_addr: socks_addr.to_string(),
            local_onion: Mutex::new(None),
            peers: Mutex::new(HashMap::new()),
            inbox: Mutex::new(Vec::new()),
            metrics: Mutex::new(TorMetricsState {
                messages_sent: 0,
                messages_delivered: 0,
                send_latencies: Vec::new(),
                last_updated: Instant::now(),
            }),
            started: Mutex::new(false),
        }
    }

    /// Set the local onion address (called from Android/platform after Tor is bootstrapped).
    pub fn set_local_onion(&self, onion: String) {
        if let Ok(mut addr) = self.local_onion.lock() {
            *addr = Some(onion);
        }
    }

    /// Queue an inbound envelope (called from the existing listener).
    pub fn queue_inbound(&self, envelope: Envelope) {
        if let Ok(mut inbox) = self.inbox.lock() {
            inbox.push(envelope);
        }
    }

    fn is_tor_ready(&self) -> bool {
        let bootstrap = BOOTSTRAP_STATUS.load(std::sync::atomic::Ordering::Relaxed);
        let circuit = CIRCUIT_ESTABLISHED.load(std::sync::atomic::Ordering::Relaxed);
        bootstrap >= 100 && circuit == 1
    }

    fn avg_latency(&self) -> Duration {
        if let Ok(m) = self.metrics.lock() {
            if m.send_latencies.is_empty() {
                return Duration::from_millis(800); // Tor typical
            }
            let total: Duration = m.send_latencies.iter().sum();
            total / m.send_latencies.len() as u32
        } else {
            Duration::from_millis(800)
        }
    }
}

impl NetworkTransport for TorTransport {
    fn transport_type(&self) -> TransportType {
        TransportType::Tor
    }

    fn start(&self) -> TransportResult<()> {
        // Tor lifecycle is managed by the platform layer (Android TorService).
        // We just mark ourselves as started and rely on bootstrap status.
        if let Ok(mut s) = self.started.lock() {
            *s = true;
        }
        info!("[AetherNet/Tor] Transport started, waiting for Tor bootstrap");
        Ok(())
    }

    fn stop(&self) -> TransportResult<()> {
        if let Ok(mut s) = self.started.lock() {
            *s = false;
        }
        info!("[AetherNet/Tor] Transport stopped");
        Ok(())
    }

    fn is_available(&self) -> bool {
        let started = self.started.lock().map(|s| *s).unwrap_or(false);
        started && self.is_tor_ready()
    }

    fn send(&self, envelope: &Envelope, route: &Route) -> TransportResult<()> {
        if !self.is_available() {
            return Err(TransportError::Unavailable("Tor not bootstrapped".into()));
        }

        let onion_addr = &route.destination.transport_addr;
        if onion_addr.is_empty() {
            return Err(TransportError::PeerNotFound(
                "no onion address for peer".into(),
            ));
        }

        let start = Instant::now();

        // Serialize the envelope
        let payload = bincode::serialize(envelope)
            .map_err(|e| TransportError::SendFailed(format!("serialize: {}", e)))?;

        // Send via SOCKS5 to the peer's onion address
        let url = format!("http://{}.onion:8080/msg", onion_addr);
        // Parse socks_addr "host:port"
        let parts: Vec<&str> = self.socks_addr.rsplitn(2, ':').collect();
        let (socks_host, socks_port) = if parts.len() == 2 {
            (parts[1].to_string(), parts[0].parse::<u16>().unwrap_or(9050))
        } else {
            ("127.0.0.1".to_string(), 9050u16)
        };
        let client = Socks5Client::new(socks_host, socks_port);
        client
            .http_post_binary(&url, &payload, "application/octet-stream")
            .map_err(|e| TransportError::SendFailed(format!("socks5: {}", e)))?;

        let elapsed = start.elapsed();

        // Update metrics
        if let Ok(mut m) = self.metrics.lock() {
            m.messages_sent += 1;
            m.messages_delivered += 1;
            m.send_latencies.push(elapsed);
            // Keep only last 100 latency samples
            if m.send_latencies.len() > 100 {
                m.send_latencies.remove(0);
            }
        }

        debug!(
            "[AetherNet/Tor] Sent envelope {} to {} in {:?}",
            envelope.id, onion_addr, elapsed
        );
        Ok(())
    }

    fn receive(&self, max_count: usize) -> TransportResult<Vec<Envelope>> {
        if let Ok(mut inbox) = self.inbox.lock() {
            let count = max_count.min(inbox.len());
            let messages: Vec<Envelope> = inbox.drain(..count).collect();
            Ok(messages)
        } else {
            Ok(Vec::new())
        }
    }

    fn local_address(&self) -> TransportResult<String> {
        self.local_onion
            .lock()
            .map_err(|_| TransportError::Internal("lock poisoned".into()))?
            .clone()
            .ok_or_else(|| TransportError::Unavailable("onion address not set".into()))
    }

    fn metrics(&self) -> TransportMetrics {
        let (sent, delivered, latency) = self
            .metrics
            .lock()
            .map(|m| (m.messages_sent, m.messages_delivered, self.avg_latency()))
            .unwrap_or((0, 0, Duration::from_millis(800)));

        let reliability = if sent > 0 {
            delivered as f64 / sent as f64
        } else {
            0.0
        };

        TransportMetrics {
            transport_type: TransportType::Tor,
            available: self.is_available(),
            latency,
            bandwidth_bps: 500_000, // ~500 KB/s typical Tor throughput
            reliability,
            anonymity_score: 0.95, // Tor provides near-maximum anonymity
            battery_cost: 0.4,
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
            .map_err(|_| TransportError::Internal("lock poisoned".into()))?
            .get(pubkey)
            .cloned()
            .ok_or_else(|| TransportError::PeerNotFound("unknown peer".into()))
    }

    fn register_peer(&self, address: PeerAddress) -> TransportResult<()> {
        self.peers
            .lock()
            .map_err(|_| TransportError::Internal("lock poisoned".into()))?
            .insert(address.public_key, address);
        Ok(())
    }

    fn peer_latency(&self, pubkey: &[u8; 32]) -> Option<Duration> {
        if self.peers.lock().ok()?.contains_key(pubkey) {
            Some(self.avg_latency())
        } else {
            None
        }
    }
}
