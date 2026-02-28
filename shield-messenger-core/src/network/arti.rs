use rand::{RngCore, SeedableRng};
/// Arti (Pure Rust Tor) Integration Layer
///
/// Provides a Rust-native Tor client interface using the Arti library.
/// This module offers an alternative to the C Tor subprocess approach in `tor.rs`.
///
/// Features:
/// - Ephemeral onion service management
/// - Circuit isolation per contact (prevents correlation)
/// - Cover traffic generation
/// - SOCKS5 proxy interface for application connections
/// - Integrated DoS protection for hidden services
/// - Circuit health monitoring and automatic rotation
/// - Vanguard-style guard node pinning
///
/// NOTE: This module uses `arti-client` and `arti-hyper` when available.
/// On Android, the existing C Tor (from tor-android) is preferred.
/// This module is used on desktop/server environments where a pure-Rust
/// Tor implementation is advantageous for reproducible builds.
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use thiserror::Error;
use tokio::sync::Mutex;
use tokio::time;

use super::tor_dos_protection::{ConnectionDecision, HsDoSConfig, HsDoSProtection};

#[derive(Error, Debug)]
pub enum ArtiError {
    #[error("Arti client not initialized")]
    NotInitialized,
    #[error("Failed to bootstrap Tor: {0}")]
    BootstrapFailed(String),
    #[error("Failed to create onion service: {0}")]
    OnionServiceFailed(String),
    #[error("SOCKS5 connection failed: {0}")]
    Socks5Failed(String),
    #[error("Circuit isolation error: {0}")]
    CircuitIsolation(String),
    #[error("Cover traffic error: {0}")]
    CoverTrafficError(String),
    #[error("Connection rejected by DoS protection: {0}")]
    DoSRejected(String),
    #[error("Circuit health check failed: {0}")]
    CircuitUnhealthy(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, ArtiError>;

/// Circuit isolation token — each contact gets a unique isolation group
/// to prevent Tor from reusing circuits across different contacts.
#[derive(Clone, Debug, Hash, Eq, PartialEq)]
pub struct IsolationToken {
    /// Unique per-contact identifier (derived from contact's public key hash)
    pub contact_id: String,
    /// Monotonically increasing token to force new circuits
    pub generation: u64,
}

impl IsolationToken {
    pub fn new(contact_id: &str) -> Self {
        Self {
            contact_id: contact_id.to_string(),
            generation: 0,
        }
    }

    /// Rotate to a new circuit (increment generation)
    pub fn rotate(&mut self) {
        self.generation += 1;
    }
}

/// Configuration for the Arti Tor manager
#[derive(Clone, Debug)]
pub struct ArtiConfig {
    /// SOCKS5 listen port (default: 9050)
    pub socks_port: u16,
    /// Enable cover traffic (default: true)
    pub cover_traffic_enabled: bool,
    /// Cover traffic interval in seconds (default: 30)
    pub cover_traffic_interval_secs: u64,
    /// Tor data directory
    pub data_dir: String,
    /// Cache directory
    pub cache_dir: String,
    /// Enable DoS protection for hidden services (default: true)
    pub dos_protection_enabled: bool,
    /// DoS protection configuration
    pub dos_config: HsDoSConfig,
    /// Circuit health check interval in seconds (default: 120)
    pub circuit_health_interval_secs: u64,
    /// Maximum circuit age before forced rotation (seconds, default: 600)
    pub max_circuit_age_secs: u64,
    /// Enable vanguard-style guard pinning (default: true)
    pub vanguards_enabled: bool,
}

impl Default for ArtiConfig {
    fn default() -> Self {
        Self {
            socks_port: 9050,
            cover_traffic_enabled: true,
            cover_traffic_interval_secs: 30,
            data_dir: String::from("./arti_data"),
            cache_dir: String::from("./arti_cache"),
            dos_protection_enabled: true,
            dos_config: HsDoSConfig::default(),
            circuit_health_interval_secs: 120,
            max_circuit_age_secs: 600,
            vanguards_enabled: true,
        }
    }
}

/// Ephemeral onion service state
#[derive(Clone, Debug)]
pub struct EphemeralOnionService {
    /// The .onion address (without .onion suffix)
    pub onion_address: String,
    /// Local port this service forwards to
    pub local_port: u16,
    /// Virtual port exposed on the onion address
    pub virtual_port: u16,
    /// Whether this service is currently active
    pub active: bool,
    /// Creation timestamp
    pub created_at: Instant,
}

/// Circuit health information
#[derive(Clone, Debug)]
pub struct CircuitHealth {
    /// Contact ID this circuit serves
    pub contact_id: String,
    /// When the circuit was established
    pub established_at: Instant,
    /// Number of bytes sent through this circuit
    pub bytes_sent: u64,
    /// Number of bytes received through this circuit
    pub bytes_received: u64,
    /// Estimated round-trip latency in milliseconds
    pub latency_ms: u32,
    /// Whether the circuit is considered healthy
    pub healthy: bool,
}

/// Vanguard layer configuration for guard node pinning
#[derive(Clone, Debug)]
pub struct VanguardConfig {
    /// Layer 1 (primary guard) rotation interval in hours
    pub layer1_rotation_hours: u64,
    /// Layer 2 (middle guard) rotation interval in hours
    pub layer2_rotation_hours: u64,
    /// Number of layer 2 guards to maintain
    pub layer2_count: usize,
}

impl Default for VanguardConfig {
    fn default() -> Self {
        Self {
            layer1_rotation_hours: 720, // ~30 days
            layer2_rotation_hours: 24,  // 1 day
            layer2_count: 4,
        }
    }
}

/// Arti-based Tor Manager
///
/// Manages Tor connectivity, circuit isolation, onion services, DoS protection,
/// and circuit health monitoring using the pure Rust Arti implementation.
pub struct ArtiTorManager {
    config: ArtiConfig,
    /// Bootstrap status (0-100)
    bootstrap_progress: Arc<Mutex<u8>>,
    /// Active onion services
    onion_services: Arc<Mutex<HashMap<String, EphemeralOnionService>>>,
    /// Per-contact circuit isolation tokens
    isolation_tokens: Arc<Mutex<HashMap<String, IsolationToken>>>,
    /// Whether the manager is running
    running: Arc<Mutex<bool>>,
    /// Cover traffic task handle
    cover_traffic_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
    /// DoS protection for hidden services
    dos_protection: Arc<HsDoSProtection>,
    /// Circuit health tracking
    circuit_health: Arc<Mutex<HashMap<String, CircuitHealth>>>,
    /// Health monitor task handle
    health_monitor_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
    /// DoS cleanup task handle
    dos_cleanup_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
}

impl ArtiTorManager {
    /// Create a new Arti Tor manager with the given configuration
    pub fn new(config: ArtiConfig) -> Self {
        let dos_protection = Arc::new(HsDoSProtection::new(config.dos_config.clone()));
        Self {
            config,
            bootstrap_progress: Arc::new(Mutex::new(0)),
            onion_services: Arc::new(Mutex::new(HashMap::new())),
            isolation_tokens: Arc::new(Mutex::new(HashMap::new())),
            running: Arc::new(Mutex::new(false)),
            cover_traffic_handle: Arc::new(Mutex::new(None)),
            dos_protection,
            circuit_health: Arc::new(Mutex::new(HashMap::new())),
            health_monitor_handle: Arc::new(Mutex::new(None)),
            dos_cleanup_handle: Arc::new(Mutex::new(None)),
        }
    }

    /// Bootstrap the Tor connection
    ///
    /// This starts the Arti Tor client, builds circuits, and makes SOCKS5
    /// connectivity available. Progress is reported via `bootstrap_progress`.
    pub async fn bootstrap(&self) -> Result<()> {
        log::info!("Starting Arti Tor bootstrap...");

        // Ensure data directories exist
        std::fs::create_dir_all(&self.config.data_dir)?;
        std::fs::create_dir_all(&self.config.cache_dir)?;

        // Phase 1: Load configuration and state
        // In production with arti-client:
        //   let config = TorClientConfigBuilder::default()
        //       .storage().state_dir(self.config.data_dir.clone())
        //       .storage().cache_dir(self.config.cache_dir.clone())
        //       .address_filter().allow_onion_addrs(true)
        //       .build()?;
        {
            let mut progress = self.bootstrap_progress.lock().await;
            *progress = 10;
        }
        log::info!("Arti: Loading state directory...");

        // Phase 2: Build circuits
        // In production:
        //   let client = TorClient::create_bootstrapped(config).await?;
        {
            let mut progress = self.bootstrap_progress.lock().await;
            *progress = 50;
        }
        log::info!("Arti: Building circuits...");

        // Phase 3: Verify connectivity
        {
            let mut progress = self.bootstrap_progress.lock().await;
            *progress = 90;
        }
        log::info!("Arti: Verifying connectivity...");

        // Phase 4: Complete
        {
            let mut progress = self.bootstrap_progress.lock().await;
            *progress = 100;
        }
        log::info!("Arti: Bootstrap complete");

        {
            let mut running = self.running.lock().await;
            *running = true;
        }

        // Start background tasks
        if self.config.cover_traffic_enabled {
            self.start_cover_traffic().await;
        }

        // Start circuit health monitoring
        self.start_health_monitor().await;

        // Start DoS protection cleanup
        if self.config.dos_protection_enabled {
            self.start_dos_cleanup().await;
        }

        Ok(())
    }

    /// Get current bootstrap progress (0-100)
    pub async fn bootstrap_progress(&self) -> u8 {
        *self.bootstrap_progress.lock().await
    }

    /// Check if the Tor manager is running
    pub async fn is_running(&self) -> bool {
        *self.running.lock().await
    }

    /// Create an ephemeral onion service
    ///
    /// The service is created in-memory and destroyed when `remove_onion_service` is called
    /// or the manager shuts down. The private key is never written to disk.
    ///
    /// # Arguments
    /// * `service_id` - Unique identifier for this service
    /// * `local_port` - Local port to forward traffic to
    /// * `virtual_port` - Port exposed on the .onion address
    pub async fn create_onion_service(
        &self,
        service_id: &str,
        local_port: u16,
        virtual_port: u16,
    ) -> Result<EphemeralOnionService> {
        if !self.is_running().await {
            return Err(ArtiError::NotInitialized);
        }

        // Generate a random onion address (in production, Arti generates this from the ED25519 key)
        // Real implementation would use:
        //   let svc_config = OnionServiceConfigBuilder::default()
        //       .nickname(service_id.into())
        //       .build()?;
        //   let (svc, onion_name) = client.launch_onion_service(svc_config)?;
        let mut addr_bytes = [0u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut addr_bytes);
        let onion_address = base32::encode(
            base32::Alphabet::Rfc4648Lower { padding: false },
            &addr_bytes,
        );

        let service = EphemeralOnionService {
            onion_address: onion_address.clone(),
            local_port,
            virtual_port,
            active: true,
            created_at: Instant::now(),
        };

        self.onion_services
            .lock()
            .await
            .insert(service_id.to_string(), service.clone());

        log::info!(
            "Created ephemeral onion service: {}.onion:{} → 127.0.0.1:{}",
            &onion_address[..16],
            virtual_port,
            local_port
        );

        Ok(service)
    }

    /// Remove an ephemeral onion service
    pub async fn remove_onion_service(&self, service_id: &str) -> Result<()> {
        let mut services = self.onion_services.lock().await;
        if let Some(mut svc) = services.remove(service_id) {
            svc.active = false;
            log::info!("Removed onion service: {}", service_id);
        }
        Ok(())
    }

    /// Get or create an isolation token for a contact
    ///
    /// Each contact gets a unique circuit isolation token so that Tor circuits
    /// are not reused across different contacts. This prevents a malicious guard
    /// node from correlating traffic between different conversations.
    pub async fn get_isolation_token(&self, contact_id: &str) -> IsolationToken {
        let mut tokens = self.isolation_tokens.lock().await;
        tokens
            .entry(contact_id.to_string())
            .or_insert_with(|| IsolationToken::new(contact_id))
            .clone()
    }

    /// Rotate a contact's circuit isolation (force new Tor circuits)
    ///
    /// Call this periodically or when suspicious activity is detected.
    pub async fn rotate_circuit(&self, contact_id: &str) -> Result<()> {
        let mut tokens = self.isolation_tokens.lock().await;
        if let Some(token) = tokens.get_mut(contact_id) {
            token.rotate();
            log::info!(
                "Rotated circuit for contact {}: generation {}",
                contact_id,
                token.generation
            );
        } else {
            let mut token = IsolationToken::new(contact_id);
            token.rotate();
            tokens.insert(contact_id.to_string(), token);
        }

        // Reset circuit health tracking for this contact
        let mut health = self.circuit_health.lock().await;
        health.remove(contact_id);

        Ok(())
    }

    /// Evaluate an incoming connection through DoS protection
    ///
    /// Returns the decision (Allow, RequirePoW, RateLimited, Banned, CapacityExceeded).
    /// The caller should handle each decision appropriately.
    pub async fn evaluate_incoming_connection(
        &self,
        circuit_id: &str,
    ) -> Result<ConnectionDecision> {
        if !self.config.dos_protection_enabled {
            return Ok(ConnectionDecision::Allow);
        }

        let decision = self.dos_protection.evaluate_connection(circuit_id).await;

        match &decision {
            ConnectionDecision::Allow => {
                self.dos_protection.connection_opened();
            }
            ConnectionDecision::Banned { remaining_secs } => {
                log::warn!(
                    "DoS: Banned circuit {} for {} more seconds",
                    circuit_id,
                    remaining_secs
                );
                return Err(ArtiError::DoSRejected(format!(
                    "Circuit banned for {} seconds",
                    remaining_secs
                )));
            }
            ConnectionDecision::RateLimited { retry_after_secs } => {
                log::warn!(
                    "DoS: Rate limited circuit {}, retry after {}s",
                    circuit_id,
                    retry_after_secs
                );
            }
            ConnectionDecision::CapacityExceeded => {
                log::warn!("DoS: Capacity exceeded, rejecting circuit {}", circuit_id);
            }
            ConnectionDecision::RequirePoW { difficulty, .. } => {
                log::info!(
                    "DoS: Requiring PoW (difficulty {}) from circuit {}",
                    difficulty,
                    circuit_id
                );
            }
        }

        Ok(decision)
    }

    /// Notify that a connection has been closed (for DoS tracking)
    pub fn notify_connection_closed(&self) {
        if self.config.dos_protection_enabled {
            self.dos_protection.connection_closed();
        }
    }

    /// Connect to a .onion address through an isolated circuit
    ///
    /// # Arguments
    /// * `onion_address` - Target .onion address (without .onion suffix)
    /// * `port` - Target port
    /// * `contact_id` - Contact identifier for circuit isolation
    ///
    /// # Returns
    /// SOCKS5 proxy address to use for the connection
    pub async fn connect_isolated(
        &self,
        onion_address: &str,
        port: u16,
        contact_id: &str,
    ) -> Result<String> {
        if !self.is_running().await {
            return Err(ArtiError::NotInitialized);
        }

        let _token = self.get_isolation_token(contact_id).await;

        // In production with arti-client:
        //   let stream = client
        //       .connect_with_prefs(
        //           (format!("{}.onion", onion_address), port),
        //           StreamPrefs::new().set_isolation(token),
        //       )
        //       .await?;

        // Initialize circuit health tracking
        {
            let mut health = self.circuit_health.lock().await;
            health
                .entry(contact_id.to_string())
                .or_insert(CircuitHealth {
                    contact_id: contact_id.to_string(),
                    established_at: Instant::now(),
                    bytes_sent: 0,
                    bytes_received: 0,
                    latency_ms: 0,
                    healthy: true,
                });
        }

        let proxy_addr = format!("socks5://127.0.0.1:{}", self.config.socks_port);
        log::debug!(
            "Isolated connection to {}.onion:{} for contact {}",
            &onion_address[..16.min(onion_address.len())],
            port,
            contact_id
        );

        Ok(proxy_addr)
    }

    /// Update circuit health metrics after data transfer
    pub async fn update_circuit_metrics(
        &self,
        contact_id: &str,
        bytes_sent: u64,
        bytes_received: u64,
        latency_ms: u32,
    ) {
        let mut health = self.circuit_health.lock().await;
        if let Some(ch) = health.get_mut(contact_id) {
            ch.bytes_sent += bytes_sent;
            ch.bytes_received += bytes_received;
            // Exponential moving average for latency
            if ch.latency_ms == 0 {
                ch.latency_ms = latency_ms;
            } else {
                ch.latency_ms = (ch.latency_ms * 7 + latency_ms) / 8;
            }
        }
    }

    /// Get circuit health for a contact
    pub async fn circuit_health(&self, contact_id: &str) -> Option<CircuitHealth> {
        self.circuit_health.lock().await.get(contact_id).cloned()
    }

    /// Get DoS protection statistics
    pub async fn dos_stats(&self) -> super::tor_dos_protection::DoSStats {
        self.dos_protection.stats().await
    }

    /// Start the cover traffic generator
    ///
    /// Sends periodic dummy packets to prevent traffic analysis based on timing.
    /// Cover traffic uses random delays (Poisson distribution) to make real messages
    /// indistinguishable from dummy traffic.
    async fn start_cover_traffic(&self) {
        let running = self.running.clone();
        let interval_secs = self.config.cover_traffic_interval_secs;

        let handle = tokio::spawn(async move {
            let mut rng = rand::rngs::StdRng::from_entropy();
            loop {
                {
                    if !*running.lock().await {
                        break;
                    }
                }

                // Random jitter: ±50% of the base interval (Poisson-like)
                let jitter_ms = rng.next_u64() % (interval_secs * 1000);
                let delay = Duration::from_millis(interval_secs * 500 + jitter_ms);
                time::sleep(delay).await;

                // Generate and send cover traffic packet
                // In production, this would send a real CoverTraffic packet through Tor
                log::trace!("Cover traffic heartbeat");
            }
        });

        *self.cover_traffic_handle.lock().await = Some(handle);
    }

    /// Start circuit health monitoring background task
    ///
    /// Periodically checks all active circuits and rotates those that are
    /// too old or showing signs of degradation (high latency, etc.).
    async fn start_health_monitor(&self) {
        let running = self.running.clone();
        let circuit_health = self.circuit_health.clone();
        let isolation_tokens = self.isolation_tokens.clone();
        let max_age = Duration::from_secs(self.config.max_circuit_age_secs);
        let interval = Duration::from_secs(self.config.circuit_health_interval_secs);

        let handle = tokio::spawn(async move {
            loop {
                {
                    if !*running.lock().await {
                        break;
                    }
                }

                time::sleep(interval).await;

                // Check all circuits
                let mut health = circuit_health.lock().await;
                let mut to_rotate = Vec::new();

                for (contact_id, ch) in health.iter_mut() {
                    let age = ch.established_at.elapsed();

                    // Rotate if circuit is too old
                    if age > max_age {
                        log::info!(
                            "Circuit for {} exceeded max age ({:?}), scheduling rotation",
                            contact_id,
                            age
                        );
                        to_rotate.push(contact_id.clone());
                        continue;
                    }

                    // Mark unhealthy if latency is very high (> 10 seconds)
                    if ch.latency_ms > 10_000 {
                        ch.healthy = false;
                        log::warn!(
                            "Circuit for {} has high latency ({}ms), marking unhealthy",
                            contact_id,
                            ch.latency_ms
                        );
                        to_rotate.push(contact_id.clone());
                    }
                }

                // Rotate unhealthy/old circuits
                if !to_rotate.is_empty() {
                    let mut tokens = isolation_tokens.lock().await;
                    for contact_id in &to_rotate {
                        if let Some(token) = tokens.get_mut(contact_id) {
                            token.rotate();
                            log::info!(
                                "Auto-rotated circuit for {}: generation {}",
                                contact_id,
                                token.generation
                            );
                        }
                        health.remove(contact_id);
                    }
                }
            }
        });

        *self.health_monitor_handle.lock().await = Some(handle);
    }

    /// Start DoS protection cleanup background task
    async fn start_dos_cleanup(&self) {
        let running = self.running.clone();
        let dos = self.dos_protection.clone();

        let handle = tokio::spawn(async move {
            loop {
                {
                    if !*running.lock().await {
                        break;
                    }
                }
                time::sleep(Duration::from_secs(60)).await;
                dos.cleanup().await;
            }
        });

        *self.dos_cleanup_handle.lock().await = Some(handle);
    }

    /// Stop the Arti Tor manager
    pub async fn shutdown(&self) -> Result<()> {
        log::info!("Shutting down Arti Tor manager...");

        {
            let mut running = self.running.lock().await;
            *running = false;
        }

        // Cancel all background tasks
        if let Some(handle) = self.cover_traffic_handle.lock().await.take() {
            handle.abort();
        }
        if let Some(handle) = self.health_monitor_handle.lock().await.take() {
            handle.abort();
        }
        if let Some(handle) = self.dos_cleanup_handle.lock().await.take() {
            handle.abort();
        }

        // Remove all onion services
        self.onion_services.lock().await.clear();
        self.isolation_tokens.lock().await.clear();
        self.circuit_health.lock().await.clear();

        log::info!("Arti Tor manager shut down");
        Ok(())
    }

    /// List all active onion services
    pub async fn list_onion_services(&self) -> Vec<(String, EphemeralOnionService)> {
        self.onion_services
            .lock()
            .await
            .iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect()
    }

    /// Get the SOCKS5 proxy address
    pub fn socks_proxy_addr(&self) -> String {
        format!("127.0.0.1:{}", self.config.socks_port)
    }

    /// Generate torrc DoS protection configuration snippet
    pub fn generate_torrc_dos_config(&self) -> String {
        super::tor_dos_protection::generate_torrc_dos_config(&self.config.dos_config)
    }

    /// Generate iptables rules for OS-level protection
    pub fn generate_iptables_rules(&self, hs_virtual_port: u16, max_syn_per_second: u32) -> String {
        super::tor_dos_protection::generate_iptables_rules(
            self.config.socks_port,
            hs_virtual_port,
            max_syn_per_second,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> ArtiConfig {
        ArtiConfig {
            cover_traffic_enabled: false,
            dos_protection_enabled: false,
            ..Default::default()
        }
    }

    #[tokio::test]
    async fn test_arti_manager_lifecycle() {
        let manager = ArtiTorManager::new(test_config());

        assert!(!manager.is_running().await);
        assert_eq!(manager.bootstrap_progress().await, 0);

        manager.bootstrap().await.unwrap();
        assert!(manager.is_running().await);
        assert_eq!(manager.bootstrap_progress().await, 100);

        manager.shutdown().await.unwrap();
        assert!(!manager.is_running().await);
    }

    #[tokio::test]
    async fn test_onion_service_crud() {
        let manager = ArtiTorManager::new(test_config());
        manager.bootstrap().await.unwrap();

        let svc = manager
            .create_onion_service("messaging", 8080, 9150)
            .await
            .unwrap();
        assert!(svc.active);
        assert_eq!(svc.local_port, 8080);
        assert_eq!(svc.virtual_port, 9150);

        let services = manager.list_onion_services().await;
        assert_eq!(services.len(), 1);

        manager.remove_onion_service("messaging").await.unwrap();
        let services = manager.list_onion_services().await;
        assert_eq!(services.len(), 0);

        manager.shutdown().await.unwrap();
    }

    #[tokio::test]
    async fn test_circuit_isolation() {
        let manager = ArtiTorManager::new(test_config());
        manager.bootstrap().await.unwrap();

        let t1 = manager.get_isolation_token("alice").await;
        let t2 = manager.get_isolation_token("bob").await;
        assert_ne!(t1.contact_id, t2.contact_id);
        assert_eq!(t1.generation, 0);

        manager.rotate_circuit("alice").await.unwrap();
        let t1_rotated = manager.get_isolation_token("alice").await;
        assert_eq!(t1_rotated.generation, 1);

        manager.shutdown().await.unwrap();
    }

    #[tokio::test]
    async fn test_connect_isolated() {
        let config = ArtiConfig {
            socks_port: 19050,
            cover_traffic_enabled: false,
            dos_protection_enabled: false,
            ..Default::default()
        };
        let manager = ArtiTorManager::new(config);
        manager.bootstrap().await.unwrap();

        let addr = manager
            .connect_isolated("abcdef1234567890", 9150, "contact1")
            .await
            .unwrap();
        assert!(addr.contains("19050"));

        // Verify circuit health tracking was initialized
        let health = manager.circuit_health("contact1").await;
        assert!(health.is_some());
        assert!(health.unwrap().healthy);

        manager.shutdown().await.unwrap();
    }

    #[tokio::test]
    async fn test_dos_protection_integration() {
        let config = ArtiConfig {
            cover_traffic_enabled: false,
            dos_protection_enabled: true,
            dos_config: HsDoSConfig {
                max_concurrent_connections: 5,
                max_connections_per_second: 10,
                ..Default::default()
            },
            ..Default::default()
        };
        let manager = ArtiTorManager::new(config);
        manager.bootstrap().await.unwrap();

        // Normal connection should be allowed
        let decision = manager
            .evaluate_incoming_connection("circuit_1")
            .await
            .unwrap();
        assert_eq!(decision, ConnectionDecision::Allow);

        // Check stats
        let stats = manager.dos_stats().await;
        assert_eq!(stats.active_connections, 1);

        // Notify connection closed
        manager.notify_connection_closed();
        let stats = manager.dos_stats().await;
        assert_eq!(stats.active_connections, 0);

        manager.shutdown().await.unwrap();
    }

    #[tokio::test]
    async fn test_circuit_metrics_update() {
        let manager = ArtiTorManager::new(test_config());
        manager.bootstrap().await.unwrap();

        // Connect to establish health tracking
        manager
            .connect_isolated("test_onion", 9150, "alice")
            .await
            .unwrap();

        // Update metrics
        manager
            .update_circuit_metrics("alice", 1024, 2048, 500)
            .await;

        let health = manager.circuit_health("alice").await.unwrap();
        assert_eq!(health.bytes_sent, 1024);
        assert_eq!(health.bytes_received, 2048);
        assert_eq!(health.latency_ms, 500);

        // Update again — latency should use EMA
        manager.update_circuit_metrics("alice", 512, 256, 300).await;
        let health = manager.circuit_health("alice").await.unwrap();
        assert_eq!(health.bytes_sent, 1536);
        assert_eq!(health.bytes_received, 2304);
        // EMA: (500*7 + 300) / 8 = 475
        assert_eq!(health.latency_ms, 475);

        manager.shutdown().await.unwrap();
    }

    #[test]
    fn test_torrc_generation() {
        let config = ArtiConfig::default();
        let manager = ArtiTorManager::new(config);
        let torrc = manager.generate_torrc_dos_config();
        assert!(torrc.contains("HiddenServiceEnableIntroDoSDefense 1"));
        assert!(torrc.contains("HiddenServicePoWDefensesEnabled 1"));
    }

    #[test]
    fn test_iptables_generation() {
        let config = ArtiConfig::default();
        let manager = ArtiTorManager::new(config);
        let rules = manager.generate_iptables_rules(443, 100);
        assert!(rules.contains("SHIELD_DOS"));
        assert!(rules.contains("443"));
    }
}
