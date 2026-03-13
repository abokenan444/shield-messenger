//! Solidarity Relay Protocol — Mutual-aid message relaying.
//!
//! Voluntary bandwidth sharing where nodes relay encrypted messages for others.
//! Uses local-only solidarity credits (reputation), onion-encrypted relay,
//! and opt-in participation. Relays cannot read message content.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use x25519_dalek::{PublicKey as X25519PublicKey, StaticSecret};

use log::{info, warn};

/// Maximum relay hops.
const MAX_RELAY_HOPS: usize = 3;
/// Solidarity credit per relay.
const CREDITS_PER_RELAY: u64 = 1;
/// Maximum daily relay bandwidth (bytes).
const MAX_DAILY_RELAY_BYTES: u64 = 50 * 1024 * 1024; // 50 MB
/// Relay timeout (seconds).
const RELAY_TIMEOUT_SECS: u64 = 30;

/// An onion-encrypted relay layer.
#[derive(Clone, Serialize, Deserialize)]
pub struct OnionLayer {
    /// Ephemeral X25519 public key for this layer.
    pub ephemeral_pub: [u8; 32],
    /// Encrypted payload (inner layer or final message).
    pub ciphertext: Vec<u8>,
    /// Nonce for decryption.
    pub nonce: [u8; 24],
    /// Next hop address (empty string = final destination).
    pub next_hop: String,
}

/// A relay request queued for forwarding.
#[derive(Clone)]
pub struct RelayRequest {
    /// Unique relay ID.
    pub id: String,
    /// The onion layer to forward.
    pub layer: OnionLayer,
    /// When this request was received.
    pub received_at: u64,
    /// Payload size in bytes.
    pub size_bytes: u64,
}

/// Solidarity relay statistics.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct SolidarityStats {
    /// Total messages relayed.
    pub messages_relayed: u64,
    /// Total bytes relayed.
    pub bytes_relayed: u64,
    /// Solidarity credits earned.
    pub credits_earned: u64,
    /// Credits spent (requesting relays).
    pub credits_spent: u64,
    /// Today's relay bandwidth usage.
    pub today_bytes: u64,
    /// Today's date (for reset).
    pub today_date: u64,
}

impl SolidarityStats {
    fn today() -> u64 {
        now_secs() / 86400
    }

    fn reset_if_new_day(&mut self) {
        let today = Self::today();
        if self.today_date != today {
            self.today_bytes = 0;
            self.today_date = today;
        }
    }

    fn can_relay(&mut self, size: u64) -> bool {
        self.reset_if_new_day();
        self.today_bytes + size <= MAX_DAILY_RELAY_BYTES
    }
}

/// The Solidarity Relay system.
pub struct SolidarityRelay {
    /// Whether relay is enabled (voluntary opt-in).
    enabled: AtomicBool,
    /// Our X25519 relay identity for onion decryption.
    relay_secret: Mutex<Option<StaticSecret>>,
    relay_public: Mutex<Option<X25519PublicKey>>,
    /// Pending relay requests.
    pending: Mutex<Vec<RelayRequest>>,
    /// Relay statistics.
    stats: Mutex<SolidarityStats>,
    /// Relay ID dedup cache.
    seen_relays: Mutex<HashMap<String, u64>>,
}

impl Default for SolidarityRelay {
    fn default() -> Self {
        Self::new()
    }
}

impl SolidarityRelay {
    pub fn new() -> Self {
        Self {
            enabled: AtomicBool::new(false),
            relay_secret: Mutex::new(None),
            relay_public: Mutex::new(None),
            pending: Mutex::new(Vec::new()),
            stats: Mutex::new(SolidarityStats::default()),
            seen_relays: Mutex::new(HashMap::new()),
        }
    }

    /// Enable solidarity relay (voluntary opt-in).
    pub fn enable(&self) {
        let secret = StaticSecret::random_from_rng(rand::thread_rng());
        let public = X25519PublicKey::from(&secret);

        if let Ok(mut s) = self.relay_secret.lock() {
            *s = Some(secret);
        }
        if let Ok(mut p) = self.relay_public.lock() {
            *p = Some(public);
        }
        self.enabled.store(true, Ordering::SeqCst);
        info!("[AetherNet/Solidarity] Relay enabled");
    }

    /// Disable solidarity relay.
    pub fn disable(&self) {
        self.enabled.store(false, Ordering::SeqCst);
        if let Ok(mut pending) = self.pending.lock() {
            pending.clear();
        }
        info!("[AetherNet/Solidarity] Relay disabled");
    }

    /// Whether relay is enabled.
    pub fn is_enabled(&self) -> bool {
        self.enabled.load(Ordering::Relaxed)
    }

    /// Get our relay public key (for others to include us in onion routes).
    pub fn relay_pubkey(&self) -> Option<[u8; 32]> {
        self.relay_public
            .lock()
            .ok()?
            .as_ref()
            .map(|p| p.to_bytes())
    }

    /// Build an onion-encrypted message with multiple relay hops.
    /// The route is a list of (relay_pubkey, relay_address) pairs, innermost first.
    pub fn build_onion(
        &self,
        plaintext: &[u8],
        route: &[([u8; 32], String)],
    ) -> Option<OnionLayer> {
        if route.is_empty() || route.len() > MAX_RELAY_HOPS {
            return None;
        }

        let mut current_payload = plaintext.to_vec();

        // Wrap in layers from innermost to outermost
        for (i, (relay_pub, next_hop)) in route.iter().enumerate().rev() {
            let ephemeral_secret = StaticSecret::random_from_rng(rand::thread_rng());
            let ephemeral_public = X25519PublicKey::from(&ephemeral_secret);

            let peer_pub = X25519PublicKey::from(*relay_pub);
            let shared = ephemeral_secret.diffie_hellman(&peer_pub);

            // Derive encryption key via HKDF (simplified: just use shared secret as key)
            let key = shared.as_bytes();
            let cipher = XChaCha20Poly1305::new_from_slice(key).ok()?;

            let mut nonce_bytes = [0u8; 24];
            rand::thread_rng().fill_bytes(&mut nonce_bytes);
            let nonce = XNonce::from_slice(&nonce_bytes);

            // The inner payload = serialized OnionLayer (or plaintext for innermost)
            let inner = if i < route.len() - 1 {
                // Inner layer already wrapped
                let layer = OnionLayer {
                    ephemeral_pub: ephemeral_public.to_bytes(),
                    ciphertext: current_payload,
                    nonce: nonce_bytes,
                    next_hop: next_hop.clone(),
                };
                bincode::serialize(&layer).ok()?
            } else {
                current_payload.clone()
            };

            let ciphertext = cipher.encrypt(nonce, inner.as_slice()).ok()?;

            current_payload = bincode::serialize(&OnionLayer {
                ephemeral_pub: ephemeral_public.to_bytes(),
                ciphertext,
                nonce: nonce_bytes,
                next_hop: next_hop.clone(),
            })
            .ok()?;
        }

        bincode::deserialize(&current_payload).ok()
    }

    /// Process an incoming onion layer (peel one layer).
    /// Returns Ok(Some(inner_layer)) if there's a next hop,
    /// Ok(None) + plaintext if we're the final destination,
    /// Err if decryption fails.
    pub fn peel_onion(&self, layer: &OnionLayer) -> Result<PeelResult, String> {
        if !self.is_enabled() {
            return Err("Relay not enabled".into());
        }

        let secret = self
            .relay_secret
            .lock()
            .map_err(|_| "Lock error")?
            .as_ref()
            .cloned()
            .ok_or("No relay key")?;

        let ephemeral_pub = X25519PublicKey::from(layer.ephemeral_pub);
        let shared = secret.diffie_hellman(&ephemeral_pub);

        let key = shared.as_bytes();
        let cipher = XChaCha20Poly1305::new_from_slice(key).map_err(|_| "Cipher init failed")?;
        let nonce = XNonce::from_slice(&layer.nonce);

        let plaintext = cipher
            .decrypt(nonce, layer.ciphertext.as_slice())
            .map_err(|_| "Decryption failed")?;

        // Update stats
        if let Ok(mut stats) = self.stats.lock() {
            if !stats.can_relay(layer.ciphertext.len() as u64) {
                return Err("Daily relay bandwidth exceeded".into());
            }
            stats.messages_relayed += 1;
            stats.bytes_relayed += layer.ciphertext.len() as u64;
            stats.today_bytes += layer.ciphertext.len() as u64;
            stats.credits_earned += CREDITS_PER_RELAY;
        }

        if layer.next_hop.is_empty() {
            // We're the final destination
            Ok(PeelResult::FinalDestination(plaintext))
        } else {
            // There's another hop — try to deserialize as OnionLayer
            match bincode::deserialize::<OnionLayer>(&plaintext) {
                Ok(inner_layer) => Ok(PeelResult::NextHop {
                    layer: inner_layer,
                    address: layer.next_hop.clone(),
                }),
                Err(_) => Err("Failed to deserialize inner layer".into()),
            }
        }
    }

    /// Submit a relay request for forwarding.
    pub fn submit_relay(&self, request: RelayRequest) -> bool {
        // Dedup
        if let Ok(mut seen) = self.seen_relays.lock() {
            if seen.contains_key(&request.id) {
                return false;
            }
            seen.insert(request.id.clone(), now_secs());
        }

        // Check bandwidth
        if let Ok(mut stats) = self.stats.lock() {
            if !stats.can_relay(request.size_bytes) {
                warn!("[AetherNet/Solidarity] Daily bandwidth limit reached");
                return false;
            }
        }

        if let Ok(mut pending) = self.pending.lock() {
            pending.push(request);
        }
        true
    }

    /// Take pending relay requests for forwarding.
    pub fn take_pending(&self) -> Vec<RelayRequest> {
        if let Ok(mut pending) = self.pending.lock() {
            let requests: Vec<_> = pending.drain(..).collect();
            requests
        } else {
            Vec::new()
        }
    }

    /// Get relay statistics.
    pub fn stats(&self) -> SolidarityStats {
        self.stats.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    /// Purge old dedup entries.
    pub fn purge_dedup(&self) {
        let threshold = now_secs() - 600;
        if let Ok(mut seen) = self.seen_relays.lock() {
            seen.retain(|_, ts| *ts >= threshold);
        }
    }
}

/// Result of peeling one onion layer.
pub enum PeelResult {
    /// There's another relay hop.
    NextHop { layer: OnionLayer, address: String },
    /// We're the final destination.
    FinalDestination(Vec<u8>),
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
