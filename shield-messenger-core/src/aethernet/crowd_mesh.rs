//! Crowd Mesh — Crowd-adaptive mesh networking for dense environments.
//!
//! Handles peer discovery, dynamic cluster formation, cluster-head election
//! (based on trust + battery), inter-cluster bridging, and epidemic routing.

use std::collections::{HashMap, HashSet};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use log::{debug, info};
use serde::{Deserialize, Serialize};

use super::trust_map::TrustMap;

/// Maximum peers per cluster.
const MAX_CLUSTER_SIZE: usize = 12;
/// Minimum peers to form a cluster.
const MIN_CLUSTER_SIZE: usize = 3;
/// Cluster head re-election interval (seconds).
const ELECTION_INTERVAL_SECS: u64 = 300;
/// Peer stale timeout (seconds).
const PEER_TIMEOUT_SECS: u64 = 120;
/// Maximum hops for epidemic routing.
const MAX_EPIDEMIC_HOPS: u8 = 5;
/// Epidemic message dedup TTL (seconds).
const DEDUP_TTL_SECS: u64 = 600;

/// A peer discovered in the mesh.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CrowdPeer {
    /// Peer's Ed25519 public key.
    pub pubkey: [u8; 32],
    /// Signal strength (0.0 - 1.0).
    pub signal_strength: f64,
    /// Peer's reported battery level (0.0 - 1.0).
    pub battery_level: f64,
    /// Whether peer has internet connectivity.
    pub has_internet: bool,
    /// Peer's cluster ID (if any).
    pub cluster_id: Option<u64>,
    /// Whether this peer is a cluster head.
    pub is_cluster_head: bool,
    /// Last seen (Unix seconds).
    pub last_seen: u64,
    /// Radio type (BLE, Wi-Fi Direct, etc.).
    pub radio_type: String,
}

/// A cluster of nearby peers.
#[derive(Clone, Debug)]
pub struct Cluster {
    /// Unique cluster ID.
    pub id: u64,
    /// Cluster head public key.
    pub head: [u8; 32],
    /// All member public keys (including head).
    pub members: HashSet<[u8; 32]>,
    /// Last election time.
    pub last_election: u64,
    /// Known bridge peers (connected to other clusters).
    pub bridges: Vec<[u8; 32]>,
}

/// An epidemic routing message.
#[derive(Clone, Serialize, Deserialize)]
pub struct EpidemicMessage {
    /// Unique message ID for deduplication.
    pub id: String,
    /// Original sender pubkey.
    pub origin: [u8; 32],
    /// Destination pubkey (or all-zeros for broadcast).
    pub destination: [u8; 32],
    /// Encrypted payload.
    pub payload: Vec<u8>,
    /// Current hop count.
    pub hop_count: u8,
    /// Maximum hops allowed.
    pub max_hops: u8,
    /// Creation timestamp (Unix seconds).
    pub created_at: u64,
}

impl EpidemicMessage {
    /// Check if this message has expired (dedup window).
    pub fn is_expired(&self) -> bool {
        now_secs() - self.created_at > DEDUP_TTL_SECS
    }

    /// Check if we can forward (hop limit not exceeded).
    pub fn can_forward(&self) -> bool {
        self.hop_count < self.max_hops
    }
}

/// The Crowd Mesh system.
pub struct CrowdMesh {
    /// Our public key.
    local_pubkey: [u8; 32],
    /// Discovered peers.
    peers: Mutex<HashMap<[u8; 32], CrowdPeer>>,
    /// Active clusters.
    clusters: Mutex<HashMap<u64, Cluster>>,
    /// Our current cluster ID.
    our_cluster: Mutex<Option<u64>>,
    /// Whether we are cluster head.
    is_head: Mutex<bool>,
    /// Seen message IDs (dedup).
    seen_messages: Mutex<HashMap<String, u64>>,
    /// Messages waiting for relay.
    relay_queue: Mutex<Vec<EpidemicMessage>>,
    /// Cluster ID counter.
    next_cluster_id: Mutex<u64>,
}

impl CrowdMesh {
    pub fn new(local_pubkey: [u8; 32]) -> Self {
        Self {
            local_pubkey,
            peers: Mutex::new(HashMap::new()),
            clusters: Mutex::new(HashMap::new()),
            our_cluster: Mutex::new(None),
            is_head: Mutex::new(false),
            seen_messages: Mutex::new(HashMap::new()),
            relay_queue: Mutex::new(Vec::new()),
            next_cluster_id: Mutex::new(1),
        }
    }

    /// Register a discovered peer.
    pub fn on_peer_discovered(&self, peer: CrowdPeer) {
        let pubkey = peer.pubkey;
        if let Ok(mut peers) = self.peers.lock() {
            peers.insert(pubkey, peer);
        }
        debug!("[AetherNet/Crowd] Peer discovered: {:?}", &pubkey[..4]);

        // Try to form or join a cluster
        self.try_cluster_formation();
    }

    /// Remove a lost peer.
    pub fn on_peer_lost(&self, pubkey: &[u8; 32]) {
        if let Ok(mut peers) = self.peers.lock() {
            peers.remove(pubkey);
        }
        // Remove from clusters
        if let Ok(mut clusters) = self.clusters.lock() {
            for cluster in clusters.values_mut() {
                cluster.members.remove(pubkey);
                if &cluster.head == pubkey {
                    // Head lost, trigger re-election
                    cluster.last_election = 0;
                }
            }
        }
        debug!("[AetherNet/Crowd] Peer lost: {:?}", &pubkey[..4]);
    }

    /// Purge stale peers.
    pub fn purge_stale(&self) -> usize {
        let threshold = now_secs() - PEER_TIMEOUT_SECS;
        let mut removed = 0;
        if let Ok(mut peers) = self.peers.lock() {
            peers.retain(|_, p| {
                let keep = p.last_seen >= threshold;
                if !keep {
                    removed += 1;
                }
                keep
            });
        }
        removed
    }

    /// Try to form or join a cluster based on nearby peers.
    fn try_cluster_formation(&self) {
        let peers = match self.peers.lock() {
            Ok(p) => p.clone(),
            Err(_) => return,
        };

        let our_cluster = self.our_cluster.lock().ok().and_then(|c| *c);

        if our_cluster.is_some() {
            return; // Already in a cluster
        }

        // Check if any neighbor is in a cluster we can join
        for (_, peer) in &peers {
            if let Some(cid) = peer.cluster_id {
                if let Ok(clusters) = self.clusters.lock() {
                    if let Some(cluster) = clusters.get(&cid) {
                        if cluster.members.len() < MAX_CLUSTER_SIZE {
                            drop(clusters);
                            self.join_cluster(cid);
                            return;
                        }
                    }
                }
            }
        }

        // No cluster to join — try to form one (need MIN_CLUSTER_SIZE neighbors)
        if peers.len() >= MIN_CLUSTER_SIZE - 1 {
            self.form_cluster(&peers);
        }
    }

    /// Form a new cluster from nearby unclustered peers.
    fn form_cluster(&self, peers: &HashMap<[u8; 32], CrowdPeer>) {
        let cluster_id = {
            let mut id = self.next_cluster_id.lock().unwrap();
            let cid = *id;
            *id += 1;
            cid
        };

        let mut members = HashSet::new();
        members.insert(self.local_pubkey);

        // Add nearby unclustered peers (sorted by signal strength)
        let mut candidates: Vec<_> = peers
            .iter()
            .filter(|(_, p)| p.cluster_id.is_none())
            .collect();
        candidates.sort_by(|a, b| {
            b.1.signal_strength
                .partial_cmp(&a.1.signal_strength)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        for (pubkey, _) in candidates.iter().take(MAX_CLUSTER_SIZE - 1) {
            members.insert(**pubkey);
        }

        if members.len() < MIN_CLUSTER_SIZE {
            return;
        }

        // Elect head: highest score = trust * battery * signal
        let head = self.elect_head(&members, peers);

        let cluster = Cluster {
            id: cluster_id,
            head,
            members,
            last_election: now_secs(),
            bridges: Vec::new(),
        };

        if let Ok(mut clusters) = self.clusters.lock() {
            clusters.insert(cluster_id, cluster);
        }
        if let Ok(mut our) = self.our_cluster.lock() {
            *our = Some(cluster_id);
        }
        if let Ok(mut ih) = self.is_head.lock() {
            *ih = head == self.local_pubkey;
        }

        info!(
            "[AetherNet/Crowd] Formed cluster {} with {} members, head={:?}",
            cluster_id,
            MIN_CLUSTER_SIZE,
            &head[..4]
        );
    }

    /// Join an existing cluster.
    fn join_cluster(&self, cluster_id: u64) {
        if let Ok(mut clusters) = self.clusters.lock() {
            if let Some(cluster) = clusters.get_mut(&cluster_id) {
                cluster.members.insert(self.local_pubkey);
                if let Ok(mut our) = self.our_cluster.lock() {
                    *our = Some(cluster_id);
                }
                info!("[AetherNet/Crowd] Joined cluster {}", cluster_id);
            }
        }
    }

    /// Elect a cluster head based on trust * battery * signal.
    fn elect_head(
        &self,
        members: &HashSet<[u8; 32]>,
        peers: &HashMap<[u8; 32], CrowdPeer>,
    ) -> [u8; 32] {
        let mut best_pubkey = self.local_pubkey;
        let mut best_score = 0.0f64;

        for pubkey in members {
            let (battery, signal) = if *pubkey == self.local_pubkey {
                (1.0, 1.0) // Assume we have good stats
            } else if let Some(peer) = peers.get(pubkey) {
                (peer.battery_level, peer.signal_strength)
            } else {
                (0.5, 0.5)
            };

            // Score: battery * signal (trust would come from TrustMap integration)
            let score = battery * 0.6 + signal * 0.4;
            if score > best_score {
                best_score = score;
                best_pubkey = *pubkey;
            }
        }

        best_pubkey
    }

    /// Check if we are currently a cluster head.
    pub fn is_cluster_head(&self) -> bool {
        *self.is_head.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Get our cluster ID.
    pub fn cluster_id(&self) -> Option<u64> {
        *self.our_cluster.lock().ok()?
    }

    /// Submit a message for epidemic routing.
    pub fn submit_epidemic(&self, msg: EpidemicMessage) -> bool {
        // Dedup
        if let Ok(mut seen) = self.seen_messages.lock() {
            if seen.contains_key(&msg.id) {
                return false;
            }
            seen.insert(msg.id.clone(), now_secs());
        }

        // If destination is us, deliver locally (return true to indicate we should process it)
        if msg.destination == self.local_pubkey {
            return true;
        }

        // Forward to relay queue
        if msg.can_forward() {
            let mut forwarded = msg;
            forwarded.hop_count += 1;
            if let Ok(mut queue) = self.relay_queue.lock() {
                queue.push(forwarded);
            }
        }

        false
    }

    /// Take messages from the relay queue for forwarding.
    pub fn take_relay_messages(&self) -> Vec<EpidemicMessage> {
        if let Ok(mut queue) = self.relay_queue.lock() {
            let msgs: Vec<_> = queue.drain(..).collect();
            msgs
        } else {
            Vec::new()
        }
    }

    /// Get bridge peers (peers connected to other clusters or with internet).
    pub fn bridge_peers(&self) -> Vec<CrowdPeer> {
        let peers = match self.peers.lock() {
            Ok(p) => p,
            Err(_) => return Vec::new(),
        };

        let our_cluster = self.our_cluster.lock().ok().and_then(|c| *c);

        peers
            .values()
            .filter(|p| {
                p.has_internet
                    || (p.cluster_id.is_some() && p.cluster_id != our_cluster)
            })
            .cloned()
            .collect()
    }

    /// Purge old dedup entries.
    pub fn purge_dedup(&self) -> usize {
        let threshold = now_secs() - DEDUP_TTL_SECS;
        let mut purged = 0;
        if let Ok(mut seen) = self.seen_messages.lock() {
            seen.retain(|_, ts| {
                let keep = *ts >= threshold;
                if !keep {
                    purged += 1;
                }
                keep
            });
        }
        purged
    }

    /// Number of discovered peers.
    pub fn peer_count(&self) -> usize {
        self.peers.lock().map(|p| p.len()).unwrap_or(0)
    }

    /// Number of active clusters.
    pub fn cluster_count(&self) -> usize {
        self.clusters.lock().map(|c| c.len()).unwrap_or(0)
    }

    /// Check if re-election is needed and perform it.
    pub fn check_election(&self, _trust_map: &TrustMap) {
        let our_cluster = match self.our_cluster.lock().ok().and_then(|c| *c) {
            Some(id) => id,
            None => return,
        };

        let needs_election = {
            let clusters = match self.clusters.lock() {
                Ok(c) => c,
                Err(_) => return,
            };
            match clusters.get(&our_cluster) {
                Some(c) => now_secs() - c.last_election > ELECTION_INTERVAL_SECS,
                None => false,
            }
        };

        if !needs_election {
            return;
        }

        let peers = match self.peers.lock() {
            Ok(p) => p.clone(),
            Err(_) => return,
        };

        if let Ok(mut clusters) = self.clusters.lock() {
            if let Some(cluster) = clusters.get_mut(&our_cluster) {
                let new_head = self.elect_head(&cluster.members, &peers);
                cluster.head = new_head;
                cluster.last_election = now_secs();

                if let Ok(mut ih) = self.is_head.lock() {
                    *ih = new_head == self.local_pubkey;
                }

                info!(
                    "[AetherNet/Crowd] Re-elected head for cluster {}: {:?}",
                    our_cluster,
                    &new_head[..4]
                );
            }
        }
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
