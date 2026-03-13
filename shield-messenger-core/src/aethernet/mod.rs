//! # AetherNet — Multi-Transport Secure Mesh Networking
//!
//! AetherNet combines Tor, I2P, and LibreMesh (BLE/Wi-Fi Direct/LoRa)
//! with smart switching, crisis modes, trust scoring, crowd-adaptive
//! mesh clustering, and voluntary solidarity relaying.
//!
//! ## Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────┐
//! │               AetherNet API                     │
//! ├─────────────────────────────────────────────────┤
//! │  SmartSwitcher │ CrisisController │ StoreForward│
//! ├────────┬───────┴───────┬──────────┴─────────────┤
//! │   Tor  │    I2P        │   LibreMesh            │
//! │Transport│  Transport   │   Transport            │
//! ├────────┴───────────────┴────────────────────────┤
//! │ IdentityVault │ TrustMap │ CrowdMesh │Solidarity│
//! └─────────────────────────────────────────────────┘
//! ```

pub mod crisis;
pub mod crowd_mesh;
pub mod i2p_transport;
pub mod identity_vault;
pub mod mesh_transport;
pub mod solidarity;
pub mod store_forward;
pub mod switcher;
pub mod tor_transport;
pub mod transport;
pub mod trust_map;

// ── Re-exports ──────────────────────────────────────────────────────────────
pub use crisis::{CrisisConfig, CrisisController, CrisisTrigger};
pub use crowd_mesh::{Cluster, CrowdMesh, CrowdPeer, EpidemicMessage};
pub use i2p_transport::I2PTransport;
pub use identity_vault::{IdentityVault, TransportIdentity};
pub use mesh_transport::MeshTransport;
pub use solidarity::{OnionLayer, PeelResult, SolidarityRelay, SolidarityStats};
pub use store_forward::{QueuedEnvelope, StoreForward};
pub use switcher::{SmartSwitcher, SwitchingDecision, ThreatLevel};
pub use tor_transport::TorTransport;
pub use transport::{
    DeliveryReceipt, Envelope, MessagePriority, NetworkTransport, PeerAddress, Route,
    TransportError, TransportEvent, TransportMetrics, TransportResult, TransportType,
};
pub use trust_map::{PenaltyReason, TrustMap, TrustRecord};

use log::{debug, info, warn};

// ── AetherNet — Main Entry Point ────────────────────────────────────────────

/// The main AetherNet handle. Owns all subsystems.
pub struct AetherNet {
    /// Smart switching engine.
    pub switcher: std::sync::Mutex<SmartSwitcher>,
    /// Crisis mode controller.
    pub crisis: CrisisController,
    /// Identity vault.
    pub vault: IdentityVault,
    /// Store-and-forward queue.
    pub store_forward: StoreForward,
    /// Trust map.
    pub trust_map: TrustMap,
    /// Crowd mesh.
    pub crowd_mesh: CrowdMesh,
    /// Solidarity relay.
    pub solidarity: SolidarityRelay,
    /// Tor transport.
    pub tor: TorTransport,
    /// I2P transport.
    pub i2p: I2PTransport,
    /// Mesh transport.
    pub mesh: MeshTransport,
    /// Our public key.
    pub local_pubkey: [u8; 32],
    /// Master key for persistence.
    pub master_key: [u8; 32],
}

impl AetherNet {
    /// Create a new AetherNet instance.
    ///
    /// # Arguments
    /// * `local_pubkey` — Our Ed25519 public key (32 bytes).
    /// * `master_key` — Master key for vault encryption (32 bytes).
    pub fn new(local_pubkey: [u8; 32], master_key: [u8; 32]) -> Self {
        let vault = IdentityVault::new();
        vault.set_master_key(master_key);

        let switcher = std::sync::Mutex::new(SmartSwitcher::new());
        let crisis = CrisisController::new();
        let store_forward = StoreForward::new();
        store_forward.set_storage_key(master_key);

        let trust_map = TrustMap::new();
        let crowd_mesh = CrowdMesh::new(local_pubkey);
        let solidarity = SolidarityRelay::new();

        let tor = TorTransport::new("127.0.0.1:9050");
        let i2p = I2PTransport::new(None);
        let mesh = MeshTransport::new();
        mesh.set_local_pubkey(local_pubkey);

        info!(
            "[AetherNet] Initialized (pubkey: {:?}...)",
            &local_pubkey[..4]
        );

        Self {
            switcher,
            crisis,
            vault,
            store_forward,
            trust_map,
            crowd_mesh,
            solidarity,
            tor,
            i2p,
            mesh,
            local_pubkey,
            master_key,
        }
    }

    /// Start all available transports.
    pub fn start(&self) {
        info!("[AetherNet] Starting transports...");

        if let Err(e) = self.tor.start() {
            warn!("[AetherNet] Tor start failed: {}", e);
        }
        if let Err(e) = self.i2p.start() {
            warn!("[AetherNet] I2P start failed: {}", e);
        }
        if let Err(e) = self.mesh.start() {
            warn!("[AetherNet] Mesh start failed: {}", e);
        }

        info!("[AetherNet] Transport startup complete");
    }

    /// Stop all transports gracefully.
    pub fn stop(&self) {
        info!("[AetherNet] Stopping transports...");
        let _ = self.tor.stop();
        let _ = self.i2p.stop();
        let _ = self.mesh.stop();
        info!("[AetherNet] All transports stopped");
    }

    /// Send a message using the smart switcher to pick the best transport.
    ///
    /// In crisis mode, sends redundantly across all available transports.
    pub fn send(&self, envelope: &Envelope, route: &Route) -> TransportResult<()> {
        let priority = self.crisis.override_priority(envelope.priority);
        let threat = self.crisis.threat_level();

        // Sync crisis threat level into the switcher
        if let Ok(mut sw) = self.switcher.lock() {
            sw.set_threat_level(threat);
        }

        let metrics = vec![self.tor.metrics(), self.i2p.metrics(), self.mesh.metrics()];

        let decision = self
            .switcher
            .lock()
            .ok()
            .and_then(|sw| sw.evaluate(&metrics, priority));

        match decision {
            Some(decision) => {
                let mut last_err = None;
                let mut sent_count = 0;
                let redundant = decision.redundant;
                let transports = if redundant {
                    decision
                        .all_scores
                        .iter()
                        .map(|(t, _)| t.clone())
                        .collect::<Vec<_>>()
                } else {
                    vec![decision.transport.clone()]
                };

                for tt in &transports {
                    let result = match tt {
                        TransportType::Tor => self.tor.send(envelope, route),
                        TransportType::I2P => self.i2p.send(envelope, route),
                        TransportType::Mesh => self.mesh.send(envelope, route),
                    };

                    match result {
                        Ok(()) => {
                            sent_count += 1;
                            self.crisis.report_success();
                            debug!("[AetherNet] Sent via {} (priority={:?})", tt, priority);

                            if !redundant {
                                return Ok(());
                            }
                        }
                        Err(e) => {
                            warn!("[AetherNet] Send via {} failed: {}", tt, e);
                            self.crisis.report_connection_failure();
                            last_err = Some(e);
                        }
                    }
                }

                if sent_count > 0 {
                    Ok(())
                } else if let Some(e) = last_err {
                    // All transports failed — queue for store-and-forward
                    self.store_forward.enqueue(
                        envelope.clone(),
                        route.preferred_transport.clone(),
                        false,
                    );
                    Err(e)
                } else {
                    Err(TransportError::Unavailable(
                        "No transports available".into(),
                    ))
                }
            }
            None => {
                // No transport available — queue for later delivery
                self.store_forward.enqueue(
                    envelope.clone(),
                    route.preferred_transport.clone(),
                    false,
                );
                Err(TransportError::Unavailable(
                    "No transports available, message queued for store-and-forward".into(),
                ))
            }
        }
    }

    /// Receive messages from all transports.
    pub fn receive(&self, max_per_transport: usize) -> Vec<Envelope> {
        let mut all = Vec::new();

        if let Ok(envelopes) = self.tor.receive(max_per_transport) {
            all.extend(envelopes);
        }
        if let Ok(envelopes) = self.i2p.receive(max_per_transport) {
            all.extend(envelopes);
        }
        if let Ok(envelopes) = self.mesh.receive(max_per_transport) {
            all.extend(envelopes);
        }

        all
    }

    /// Process the store-and-forward retry queue.
    /// Call this periodically (e.g., every 5 seconds).
    pub fn process_retry_queue(&self) {
        while let Some(queued) = self.store_forward.next_ready() {
            let route = Route {
                destination: PeerAddress {
                    public_key: queued.envelope.recipient_pubkey,
                    transport_addr: String::new(),
                    transport_type: queued
                        .preferred_transport
                        .clone()
                        .unwrap_or(TransportType::Tor),
                },
                preferred_transport: queued.preferred_transport.clone(),
                max_latency: None,
                redundant: queued.redundant,
            };

            match self.send(&queued.envelope, &route) {
                Ok(()) => {
                    self.store_forward.mark_delivered(&queued.envelope.id);
                }
                Err(_) => {
                    self.store_forward.requeue_failed(queued);
                }
            }
        }
    }

    /// Engage crisis mode.
    pub fn activate_crisis(&self, trigger: CrisisTrigger) {
        self.crisis.activate(trigger);
        self.vault.rotate_all();
        info!("[AetherNet] Crisis mode engaged — all identities rotated");
    }

    /// Disengage crisis mode.
    pub fn deactivate_crisis(&self) {
        self.crisis.deactivate();
        info!("[AetherNet] Crisis mode disengaged");
    }

    /// Enable solidarity relay (opt-in).
    pub fn enable_solidarity(&self) {
        self.solidarity.enable();
    }

    /// Get a status snapshot.
    pub fn status(&self) -> AetherNetStatus {
        AetherNetStatus {
            tor_available: self.tor.is_available(),
            i2p_available: self.i2p.is_available(),
            mesh_available: self.mesh.is_available(),
            crisis_active: self.crisis.is_active(),
            threat_level: self.crisis.threat_level(),
            pending_messages: self.store_forward.pending_count(),
            mesh_peers: self.crowd_mesh.peer_count(),
            mesh_clusters: self.crowd_mesh.cluster_count(),
            solidarity_enabled: self.solidarity.is_enabled(),
            solidarity_stats: self.solidarity.stats(),
            trust_peers: self.trust_map.peer_count(),
        }
    }

    /// Set the Tor hidden service onion address for the Tor transport layer.
    pub fn set_tor_onion(&self, onion: &str) {
        self.tor.set_local_onion(onion.to_string());
        let len = onion.len();
        info!(
            "[AetherNet] Tor onion set: {}...{}",
            &onion[..8.min(len)],
            &onion[len.saturating_sub(6)..]
        );
    }

    /// Feed inbound data from the mesh platform layer (BLE/WiFi Direct/LoRa).
    pub fn mesh_on_peer_discovered(
        &self,
        pubkey: [u8; 32],
        radio_addr: String,
        radio: mesh_transport::MeshRadio,
        signal_strength: i16,
        has_internet: bool,
        battery_level: Option<u8>,
    ) {
        self.mesh.on_peer_discovered(
            pubkey,
            radio_addr,
            radio,
            signal_strength,
            has_internet,
            battery_level,
        );

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let crowd_peer = crowd_mesh::CrowdPeer {
            pubkey,
            signal_strength: (signal_strength.max(-100) as f64 + 100.0) / 100.0,
            battery_level: battery_level.map(|b| b as f64 / 100.0).unwrap_or(0.5),
            has_internet,
            cluster_id: None,
            is_cluster_head: false,
            last_seen: now,
            radio_type: format!("{:?}", radio),
        };
        self.crowd_mesh.on_peer_discovered(crowd_peer);
        self.trust_map.record_relay_success(&pubkey, 0);
    }

    /// Feed inbound mesh data from the platform layer.
    pub fn mesh_on_data_received(&self, data: &[u8]) {
        self.mesh.on_data_received(data);
    }

    /// Notify that a mesh peer was lost.
    pub fn mesh_on_peer_lost(&self, pubkey: &[u8; 32]) {
        self.mesh.on_peer_lost(pubkey);
        self.crowd_mesh.on_peer_lost(pubkey);
    }

    /// Take outbound mesh packets for the platform to send over BLE/WiFi/LoRa.
    /// Returns list of (data, optional_target_pubkey) pairs.
    pub fn mesh_take_outbound(&self) -> Vec<(Vec<u8>, Option<[u8; 32]>)> {
        let mut result = Vec::new();
        while let Some(out) = self.mesh.take_outbound() {
            result.push((out.data, out.target));
        }
        result
    }

    /// Feed inbound Tor data (called when data arrives on the Tor hidden service).
    pub fn tor_queue_inbound(&self, envelope: Envelope) {
        self.tor.queue_inbound(envelope);
    }

    /// Persist store-forward queue and trust map to encrypted bytes.
    pub fn persist(&self) -> (Option<Vec<u8>>, Option<Vec<u8>>) {
        let sf = self.store_forward.encrypt_queue();
        let tm = self.trust_map.serialize();
        (sf, tm)
    }

    /// Restore store-forward queue and trust map from encrypted bytes.
    pub fn restore(&self, sf_data: Option<&[u8]>, tm_data: Option<&[u8]>) {
        if let Some(data) = sf_data {
            if self.store_forward.decrypt_queue(data) {
                info!("[AetherNet] Store-forward queue restored");
            }
        }
        if let Some(data) = tm_data {
            if self.trust_map.deserialize(data) {
                info!("[AetherNet] Trust map restored");
            }
        }
    }

    /// Periodic maintenance — call every ~30 seconds.
    pub fn tick(&self) {
        // Sync crisis threat level into the switcher
        let threat = self.crisis.threat_level();
        if let Ok(mut sw) = self.switcher.lock() {
            sw.set_threat_level(threat);
        }

        self.process_retry_queue();
        self.store_forward.purge_expired();
        self.crowd_mesh.purge_stale();
        self.crowd_mesh.purge_dedup();
        self.solidarity.purge_dedup();
        self.trust_map.prune_stale();
        self.crowd_mesh.check_election(&self.trust_map);

        debug!(
            "[AetherNet] tick: threat={:?}, pending={}, peers={}, clusters={}",
            threat,
            self.store_forward.pending_count(),
            self.crowd_mesh.peer_count(),
            self.crowd_mesh.cluster_count(),
        );
    }
}

/// AetherNet status snapshot.
#[derive(Debug, Clone)]
pub struct AetherNetStatus {
    pub tor_available: bool,
    pub i2p_available: bool,
    pub mesh_available: bool,
    pub crisis_active: bool,
    pub threat_level: ThreatLevel,
    pub pending_messages: usize,
    pub mesh_peers: usize,
    pub mesh_clusters: usize,
    pub solidarity_enabled: bool,
    pub solidarity_stats: SolidarityStats,
    pub trust_peers: usize,
}
