//! Identity Vault — Per-network cryptographic identity management.
//!
//! Manages separate cryptographic identities for each transport network,
//! with automatic rotation and encrypted local storage.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use ed25519_dalek::Signer;
use ed25519_dalek::SigningKey;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use x25519_dalek::{PublicKey as X25519PublicKey, StaticSecret};
use zeroize::Zeroize;

use log::info;

use super::transport::TransportType;

/// Identity rotation interval (default: 24 hours).
const DEFAULT_ROTATION_INTERVAL_SECS: u64 = 24 * 3600;
/// Crisis mode rotation interval: every message.
const CRISIS_ROTATION_INTERVAL_SECS: u64 = 0;

/// A cryptographic identity for a specific transport network.
#[derive(Clone, Serialize, Deserialize)]
pub struct TransportIdentity {
    /// Which transport this identity is for.
    pub transport_type: TransportType,
    /// Ed25519 signing key (32 bytes private).
    pub signing_key: [u8; 32],
    /// Ed25519 verifying key (public, 32 bytes).
    pub verifying_key: [u8; 32],
    /// X25519 static secret (32 bytes) for key exchange.
    pub x25519_secret: [u8; 32],
    /// X25519 public key (32 bytes).
    pub x25519_public: [u8; 32],
    /// Transport-specific address derived from this identity.
    pub transport_address: String,
    /// When this identity was created (Unix seconds).
    pub created_at: u64,
    /// When this identity should be rotated (Unix seconds).
    pub rotate_at: u64,
    /// Generation counter (increments on each rotation).
    pub generation: u64,
}

impl TransportIdentity {
    /// Generate a new random identity.
    pub fn generate(transport_type: TransportType, rotation_interval_secs: u64) -> Self {
        let mut rng = rand::thread_rng();

        // Ed25519 signing key
        let signing_key = SigningKey::generate(&mut rng);
        let verifying_key = signing_key.verifying_key();

        // X25519 key exchange
        let x25519_secret = StaticSecret::random_from_rng(&mut rng);
        let x25519_public = X25519PublicKey::from(&x25519_secret);

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let rotate_at = if rotation_interval_secs == 0 {
            0 // Rotate every message
        } else {
            now + rotation_interval_secs
        };

        Self {
            transport_type,
            signing_key: signing_key.to_bytes(),
            verifying_key: verifying_key.to_bytes(),
            x25519_secret: x25519_secret.to_bytes(),
            x25519_public: x25519_public.to_bytes(),
            transport_address: String::new(), // Set by transport after creation
            created_at: now,
            rotate_at,
            generation: 0,
        }
    }

    /// Check if this identity needs rotation.
    pub fn needs_rotation(&self) -> bool {
        if self.rotate_at == 0 {
            return true; // Per-message rotation (crisis mode)
        }
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        now >= self.rotate_at
    }

    /// Sign data with this identity's Ed25519 key.
    pub fn sign(&self, data: &[u8]) -> [u8; 64] {
        let signing_key = SigningKey::from_bytes(&self.signing_key);
        let sig = signing_key.sign(data);
        sig.to_bytes()
    }

    /// Derive a shared secret with a peer's X25519 public key.
    pub fn derive_shared_secret(&self, peer_x25519_pub: &[u8; 32]) -> [u8; 32] {
        let secret = StaticSecret::from(self.x25519_secret);
        let peer_pub = X25519PublicKey::from(*peer_x25519_pub);
        let shared = secret.diffie_hellman(&peer_pub);
        *shared.as_bytes()
    }
}

impl Drop for TransportIdentity {
    fn drop(&mut self) {
        self.signing_key.zeroize();
        self.x25519_secret.zeroize();
    }
}

/// The Identity Vault manages all transport identities.
pub struct IdentityVault {
    /// Per-transport identities.
    identities: Mutex<HashMap<TransportType, TransportIdentity>>,
    /// Master key for vault encryption (derived from user's password).
    master_key: Mutex<Option<[u8; 32]>>,
    /// Rotation interval (seconds). Behind Mutex so it can be updated at runtime.
    rotation_interval: Mutex<u64>,
    /// Historical identities (for verifying messages signed with old keys).
    history: Mutex<HashMap<TransportType, Vec<[u8; 32]>>>,
}

impl Default for IdentityVault {
    fn default() -> Self {
        Self::new()
    }
}

impl IdentityVault {
    pub fn new() -> Self {
        Self {
            identities: Mutex::new(HashMap::new()),
            master_key: Mutex::new(None),
            rotation_interval: Mutex::new(DEFAULT_ROTATION_INTERVAL_SECS),
            history: Mutex::new(HashMap::new()),
        }
    }

    /// Set the master encryption key for the vault.
    pub fn set_master_key(&self, key: [u8; 32]) {
        if let Ok(mut mk) = self.master_key.lock() {
            *mk = Some(key);
        }
    }

    /// Set rotation interval (0 = per-message rotation for crisis mode).
    pub fn set_rotation_interval(&self, secs: u64) {
        if let Ok(mut interval) = self.rotation_interval.lock() {
            *interval = secs;
        }
        info!("[AetherNet/Vault] Rotation interval set to {}s", secs);
    }

    /// Generate or retrieve the identity for a transport.
    pub fn get_or_create(&self, transport_type: TransportType) -> TransportIdentity {
        let mut ids = self.identities.lock().unwrap();

        if let Some(existing) = ids.get(&transport_type) {
            if !existing.needs_rotation() {
                return existing.clone();
            }
            // Needs rotation — save old verifying key to history
            if let Ok(mut history) = self.history.lock() {
                history
                    .entry(transport_type.clone())
                    .or_insert_with(Vec::new)
                    .push(existing.verifying_key);
            }
            info!(
                "[AetherNet/Vault] Rotating identity for {} (generation {})",
                transport_type,
                existing.generation + 1
            );
        }

        let interval = self
            .rotation_interval
            .lock()
            .map(|v| *v)
            .unwrap_or(DEFAULT_ROTATION_INTERVAL_SECS);
        let mut identity = TransportIdentity::generate(transport_type.clone(), interval);
        if let Some(old) = ids.get(&transport_type) {
            identity.generation = old.generation + 1;
        }

        ids.insert(transport_type, identity.clone());
        identity
    }

    /// Get an existing identity without creating one.
    pub fn get(&self, transport_type: &TransportType) -> Option<TransportIdentity> {
        self.identities.lock().ok()?.get(transport_type).cloned()
    }

    /// Force rotation of all identities (called during crisis mode).
    pub fn rotate_all(&self) {
        if let Ok(mut ids) = self.identities.lock() {
            let types: Vec<TransportType> = ids.keys().cloned().collect();
            for tt in types {
                if let Some(old) = ids.get(&tt) {
                    let ri = self
                        .rotation_interval
                        .lock()
                        .map(|v| *v)
                        .unwrap_or(DEFAULT_ROTATION_INTERVAL_SECS);
                    let mut new_id = TransportIdentity::generate(tt.clone(), ri);
                    new_id.generation = old.generation + 1;

                    // Save old key to history
                    if let Ok(mut history) = self.history.lock() {
                        history
                            .entry(tt.clone())
                            .or_insert_with(Vec::new)
                            .push(old.verifying_key);
                    }

                    ids.insert(tt, new_id);
                }
            }
        }
        info!("[AetherNet/Vault] All identities rotated (crisis rotation)");
    }

    /// Encrypt the vault for disk persistence.
    pub fn encrypt_vault(&self) -> Option<Vec<u8>> {
        let master_key = (*self.master_key.lock().ok()?)?;
        let ids = self.identities.lock().ok()?;

        let plaintext = bincode::serialize(&*ids).ok()?;

        let cipher = XChaCha20Poly1305::new_from_slice(&master_key).ok()?;
        let mut nonce_bytes = [0u8; 24];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = XNonce::from_slice(&nonce_bytes);

        let ciphertext = cipher.encrypt(nonce, plaintext.as_slice()).ok()?;

        // Format: nonce (24) || ciphertext
        let mut output = Vec::with_capacity(24 + ciphertext.len());
        output.extend_from_slice(&nonce_bytes);
        output.extend_from_slice(&ciphertext);
        Some(output)
    }

    /// Decrypt and restore the vault from disk.
    pub fn decrypt_vault(&self, encrypted: &[u8]) -> bool {
        if encrypted.len() < 24 {
            return false;
        }

        let master_key = match self.master_key.lock().ok().and_then(|k| *k) {
            Some(k) => k,
            None => return false,
        };

        let nonce = XNonce::from_slice(&encrypted[..24]);
        let ciphertext = &encrypted[24..];

        let cipher = match XChaCha20Poly1305::new_from_slice(&master_key) {
            Ok(c) => c,
            Err(_) => return false,
        };

        let plaintext = match cipher.decrypt(nonce, ciphertext) {
            Ok(p) => p,
            Err(_) => return false,
        };

        match bincode::deserialize::<HashMap<TransportType, TransportIdentity>>(&plaintext) {
            Ok(ids) => {
                if let Ok(mut current) = self.identities.lock() {
                    *current = ids;
                }
                info!("[AetherNet/Vault] Vault restored from encrypted storage");
                true
            }
            Err(_) => false,
        }
    }

    /// Check if a verifying key was ever used by a transport (current or historical).
    pub fn is_known_key(&self, transport_type: &TransportType, verifying_key: &[u8; 32]) -> bool {
        // Check current identity
        if let Some(id) = self.get(transport_type) {
            if &id.verifying_key == verifying_key {
                return true;
            }
        }
        // Check history
        if let Ok(history) = self.history.lock() {
            if let Some(keys) = history.get(transport_type) {
                return keys.contains(verifying_key);
            }
        }
        false
    }
}

impl Drop for IdentityVault {
    fn drop(&mut self) {
        if let Ok(mut mk) = self.master_key.lock() {
            if let Some(ref mut key) = *mk {
                key.zeroize();
            }
        }
    }
}
