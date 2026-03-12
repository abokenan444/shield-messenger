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

pub mod transport;
pub mod tor_transport;
pub mod i2p_transport;
pub mod mesh_transport;
pub mod switcher;
pub mod identity_vault;
pub mod store_forward;
pub mod crisis;
pub mod trust_map;
pub mod crowd_mesh;
pub mod solidarity;

// ── Re-exports ──────────────────────────────────────────────────────────────
pub use transport::{
    DeliveryReceipt, Envelope, MessagePriority, NetworkTransport, PeerAddress, Route,
    TransportError, TransportEvent, TransportMetrics, TransportResult, TransportType,
};
pub use switcher::{SmartSwitcher, SwitchingDecision, ThreatLevel};
pub use crisis::{CrisisController, CrisisConfig, CrisisTrigger};
pub use identity_vault::{IdentityVault, TransportIdentity};
pub use store_forward::{StoreForward, QueuedEnvelope};
pub use trust_map::{TrustMap, TrustRecord, PenaltyReason};
pub use crowd_mesh::{CrowdMesh, CrowdPeer, Cluster, EpidemicMessage};
pub use solidarity::{SolidarityRelay, SolidarityStats, OnionLayer, PeelResult};
pub use tor_transport::TorTransport;
pub use i2p_transport::I2PTransport;
pub use mesh_transport::MeshTransport;

use log::{debug, info, warn};

// ── AetherNet — Main Entry Point ────────────────────────────────────────────

/// The main AetherNet handle. Owns all subsystems.
pub struct AetherNet {
    /// Smart switching engine.
    pub switcher: SmartSwitcher,
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

        let switcher = SmartSwitcher::new();
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

        info!("[AetherNet] Initialized (pubkey: {:?}...)", &local_pubkey[..4]);

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
        // Apply crisis overrides
        let priority = self.crisis.override_priority(envelope.priority);
        let _threat = self.crisis.threat_level();

        // Collect metrics from all transports
        let metrics = vec![
            self.tor.metrics(),
            self.i2p.metrics(),
            self.mesh.metrics(),
        ];

        // Ask switcher which transport(s) to use
        let decision = self.switcher.evaluate(&metrics, priority);

        match decision {
            Some(decision) => {
                let mut last_err = None;
                let mut sent_count = 0;
                let redundant = decision.redundant;
                let transports = if redundant {
                    decision.all_scores.iter().map(|(t, _)| t.clone()).collect::<Vec<_>>()
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
                    Err(TransportError::Unavailable("No transports available".into()))
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

    /// Periodic maintenance — call every ~30 seconds.
    pub fn tick(&self) {
        // Process retry queue
        self.process_retry_queue();
        // Purge expired store-forward entries
        self.store_forward.purge_expired();
        // Purge stale mesh peers
        self.crowd_mesh.purge_stale();
        // Purge dedup caches
        self.crowd_mesh.purge_dedup();
        self.solidarity.purge_dedup();
        // Prune stale trust records
        self.trust_map.prune_stale();
        // Check cluster election
        self.crowd_mesh.check_election(&self.trust_map);
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
