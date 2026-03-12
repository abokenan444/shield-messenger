//! Store-and-Forward Queue — Offline delivery with encrypted persistence.
//!
//! Queues outbound envelopes when recipients are offline, with priority ordering,
//! TTL expiry, exponential backoff retry, and encrypted-at-rest storage.

use std::collections::BinaryHeap;
use std::cmp::Ordering;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};

use log::{debug, info, warn};

use super::transport::{Envelope, MessagePriority, TransportType};

/// Default TTL: 7 days (in seconds).
const DEFAULT_TTL_SECS: u64 = 7 * 24 * 3600;
/// Maximum retry attempts before dropping.
const MAX_RETRIES: u32 = 50;
/// Base backoff in milliseconds.
const BASE_BACKOFF_MS: u64 = 1000;
/// Maximum backoff cap: 1 hour.
const MAX_BACKOFF_MS: u64 = 3600_000;
/// Maximum queue size (to prevent memory exhaustion).
const MAX_QUEUE_SIZE: usize = 10_000;

/// A queued envelope awaiting delivery.
#[derive(Clone, Serialize, Deserialize)]
pub struct QueuedEnvelope {
    /// The envelope to deliver.
    pub envelope: Envelope,
    /// Preferred transport for delivery.
    pub preferred_transport: Option<TransportType>,
    /// When this entry was enqueued (Unix seconds).
    pub enqueued_at: u64,
    /// When this entry expires (Unix seconds).
    pub expires_at: u64,
    /// Number of delivery attempts so far.
    pub attempts: u32,
    /// Next retry time (Unix millis).
    pub next_retry_at: u64,
    /// Whether this is a redundant copy (crisis mode).
    pub redundant: bool,
}

impl QueuedEnvelope {
    /// Calculate priority score for heap ordering.
    /// Higher = more urgent.
    fn priority_score(&self) -> u64 {
        let base = match self.envelope.priority {
            MessagePriority::Critical => 1000,
            MessagePriority::Urgent => 100,
            MessagePriority::Normal => 10,
            MessagePriority::Bulk => 1,
        };
        // Older messages get slight priority boost (prevent starvation)
        let age_bonus = (now_secs() - self.enqueued_at).min(100);
        base + age_bonus
    }

    /// Check if this envelope has expired.
    pub fn is_expired(&self) -> bool {
        now_secs() >= self.expires_at
    }

    /// Check if it's time to retry delivery.
    pub fn is_ready_for_retry(&self) -> bool {
        now_millis() >= self.next_retry_at
    }

    /// Record a failed delivery attempt and compute next backoff.
    pub fn record_failure(&mut self) {
        self.attempts += 1;
        let backoff = (BASE_BACKOFF_MS * 2u64.saturating_pow(self.attempts.min(20)))
            .min(MAX_BACKOFF_MS);
        // Add jitter (0-25% of backoff)
        let jitter = (rand::random::<u64>() % (backoff / 4 + 1)) as u64;
        self.next_retry_at = now_millis() + backoff + jitter;
        debug!(
            "[AetherNet/SAF] Attempt {} failed for envelope {}, next retry in {}ms",
            self.attempts, self.envelope.id, backoff + jitter
        );
    }

    /// Whether we've exhausted retries.
    pub fn max_retries_exceeded(&self) -> bool {
        self.attempts >= MAX_RETRIES
    }
}

impl PartialEq for QueuedEnvelope {
    fn eq(&self, other: &Self) -> bool {
        self.envelope.id == other.envelope.id
    }
}

impl Eq for QueuedEnvelope {}

impl PartialOrd for QueuedEnvelope {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for QueuedEnvelope {
    fn cmp(&self, other: &Self) -> Ordering {
        self.priority_score().cmp(&other.priority_score())
    }
}

/// The Store-and-Forward system.
pub struct StoreForward {
    /// Priority queue of pending envelopes.
    queue: Mutex<BinaryHeap<QueuedEnvelope>>,
    /// Encryption key for at-rest storage (optional).
    storage_key: Mutex<Option<[u8; 32]>>,
    /// Successfully delivered envelope IDs (recent LRU for dedup).
    delivered: Mutex<Vec<String>>,
    /// Max delivered history size.
    delivered_max: usize,
}

impl StoreForward {
    pub fn new() -> Self {
        Self {
            queue: Mutex::new(BinaryHeap::new()),
            storage_key: Mutex::new(None),
            delivered: Mutex::new(Vec::new()),
            delivered_max: 5000,
        }
    }

    /// Set the encryption key for persistent storage.
    pub fn set_storage_key(&self, key: [u8; 32]) {
        if let Ok(mut k) = self.storage_key.lock() {
            *k = Some(key);
        }
    }

    /// Enqueue an envelope for delivery.
    pub fn enqueue(
        &self,
        envelope: Envelope,
        preferred_transport: Option<TransportType>,
        redundant: bool,
    ) -> bool {
        // Dedup: check if already delivered
        if let Ok(delivered) = self.delivered.lock() {
            if delivered.contains(&envelope.id) {
                debug!("[AetherNet/SAF] Dropping duplicate envelope {}", envelope.id);
                return false;
            }
        }

        let now = now_secs();
        let ttl = if envelope.ttl > 0 {
            envelope.ttl
        } else {
            DEFAULT_TTL_SECS
        };

        let entry = QueuedEnvelope {
            envelope,
            preferred_transport,
            enqueued_at: now,
            expires_at: now + ttl,
            attempts: 0,
            next_retry_at: 0, // Ready immediately
            redundant,
        };

        if let Ok(mut q) = self.queue.lock() {
            if q.len() >= MAX_QUEUE_SIZE {
                warn!("[AetherNet/SAF] Queue full ({} items), dropping lowest priority", q.len());
                // Remove the lowest priority item
                let mut items: Vec<_> = q.drain().collect();
                items.sort();
                if !items.is_empty() {
                    items.remove(0); // Remove lowest priority
                }
                for item in items {
                    q.push(item);
                }
            }
            let id = entry.envelope.id.clone();
            q.push(entry);
            info!("[AetherNet/SAF] Enqueued envelope {} ({} total)", id, q.len());
            true
        } else {
            false
        }
    }

    /// Get the next envelope ready for delivery attempt.
    /// Returns None if no envelopes are ready.
    pub fn next_ready(&self) -> Option<QueuedEnvelope> {
        if let Ok(mut q) = self.queue.lock() {
            // Purge expired entries
            let mut items: Vec<_> = q.drain().collect();
            items.retain(|e| !e.is_expired() && !e.max_retries_exceeded());

            let mut ready_idx = None;
            // Find the highest-priority ready item
            items.sort_by(|a, b| b.cmp(a)); // Sort descending by priority
            for (i, item) in items.iter().enumerate() {
                if item.is_ready_for_retry() {
                    ready_idx = Some(i);
                    break;
                }
            }

            let result = ready_idx.map(|i| items.remove(i));

            // Put remaining items back
            for item in items {
                q.push(item);
            }

            result
        } else {
            None
        }
    }

    /// Mark an envelope as successfully delivered.
    pub fn mark_delivered(&self, envelope_id: &str) {
        // Remove from queue if still there
        if let Ok(mut q) = self.queue.lock() {
            let items: Vec<_> = q.drain().filter(|e| e.envelope.id != envelope_id).collect();
            for item in items {
                q.push(item);
            }
        }
        // Add to delivered set
        if let Ok(mut delivered) = self.delivered.lock() {
            delivered.push(envelope_id.to_string());
            if delivered.len() > self.delivered_max {
                delivered.remove(0);
            }
        }
        debug!("[AetherNet/SAF] Marked delivered: {}", envelope_id);
    }

    /// Re-enqueue a failed envelope with backoff.
    pub fn requeue_failed(&self, mut entry: QueuedEnvelope) {
        entry.record_failure();
        if entry.max_retries_exceeded() || entry.is_expired() {
            warn!(
                "[AetherNet/SAF] Dropping envelope {} (retries={}, expired={})",
                entry.envelope.id,
                entry.max_retries_exceeded(),
                entry.is_expired()
            );
            return;
        }
        if let Ok(mut q) = self.queue.lock() {
            q.push(entry);
        }
    }

    /// Number of pending envelopes.
    pub fn pending_count(&self) -> usize {
        self.queue.lock().map(|q| q.len()).unwrap_or(0)
    }

    /// Encrypt the queue for disk persistence.
    pub fn encrypt_queue(&self) -> Option<Vec<u8>> {
        let key = self.storage_key.lock().ok()?.clone()?;
        let q = self.queue.lock().ok()?;

        let items: Vec<QueuedEnvelope> = q.iter().cloned().collect();
        let plaintext = bincode::serialize(&items).ok()?;

        let cipher = XChaCha20Poly1305::new_from_slice(&key).ok()?;
        let mut nonce_bytes = [0u8; 24];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = XNonce::from_slice(&nonce_bytes);

        let ciphertext = cipher.encrypt(nonce, plaintext.as_slice()).ok()?;

        let mut output = Vec::with_capacity(24 + ciphertext.len());
        output.extend_from_slice(&nonce_bytes);
        output.extend_from_slice(&ciphertext);
        Some(output)
    }

    /// Decrypt and restore the queue from disk.
    pub fn decrypt_queue(&self, encrypted: &[u8]) -> bool {
        if encrypted.len() < 24 {
            return false;
        }

        let key = match self.storage_key.lock().ok().and_then(|k| *k) {
            Some(k) => k,
            None => return false,
        };

        let nonce = XNonce::from_slice(&encrypted[..24]);
        let ciphertext = &encrypted[24..];

        let cipher = match XChaCha20Poly1305::new_from_slice(&key) {
            Ok(c) => c,
            Err(_) => return false,
        };

        let plaintext = match cipher.decrypt(nonce, ciphertext) {
            Ok(p) => p,
            Err(_) => return false,
        };

        match bincode::deserialize::<Vec<QueuedEnvelope>>(&plaintext) {
            Ok(items) => {
                if let Ok(mut q) = self.queue.lock() {
                    for item in items {
                        if !item.is_expired() {
                            q.push(item);
                        }
                    }
                }
                info!("[AetherNet/SAF] Queue restored from encrypted storage");
                true
            }
            Err(_) => false,
        }
    }

    /// Purge all expired and max-retry entries.
    pub fn purge_expired(&self) -> usize {
        let mut purged = 0;
        if let Ok(mut q) = self.queue.lock() {
            let before = q.len();
            let items: Vec<_> = q
                .drain()
                .filter(|e| !e.is_expired() && !e.max_retries_exceeded())
                .collect();
            purged = before - items.len();
            for item in items {
                q.push(item);
            }
        }
        if purged > 0 {
            info!("[AetherNet/SAF] Purged {} expired/exhausted entries", purged);
        }
        purged
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
