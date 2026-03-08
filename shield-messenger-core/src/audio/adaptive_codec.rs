/// Adaptive Codec Controller for Tor Voice Calls
///
/// Dynamically adjusts Opus encoder parameters based on real-time network quality:
/// - Bitrate: 12-48 kbps (adapts to bandwidth)
/// - DTX: Enabled when bandwidth is scarce
/// - Complexity: Reduced on weak connections to save CPU
///
/// Quality Tiers:
///   HIGH:   24 kbps, complexity 10, DTX off (good Tor circuit)
///   MEDIUM: 16 kbps, complexity 8,  DTX off (moderate loss/latency)
///   LOW:    12 kbps, complexity 6,  DTX on  (poor circuit, high loss)
///
/// Tier transitions use hysteresis to prevent flapping.
use jni::objects::JClass;
use jni::sys::{jint, jlong};
use jni::JNIEnv;
use std::os::raw::c_void;
use std::sync::Mutex;

/// Quality tier for adaptive codec
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum QualityTier {
    High,
    Medium,
    Low,
}

impl QualityTier {
    pub fn bitrate(&self) -> i32 {
        match self {
            QualityTier::High => 24000,
            QualityTier::Medium => 16000,
            QualityTier::Low => 12000,
        }
    }

    pub fn complexity(&self) -> i32 {
        match self {
            QualityTier::High => 10,
            QualityTier::Medium => 8,
            QualityTier::Low => 6,
        }
    }

    pub fn dtx_enabled(&self) -> bool {
        match self {
            QualityTier::High => false,
            QualityTier::Medium => false,
            QualityTier::Low => true,
        }
    }

    pub fn max_bandwidth(&self) -> i32 {
        match self {
            QualityTier::High => 1104,   // SUPERWIDEBAND (12 kHz)
            QualityTier::Medium => 1103, // WIDEBAND (8 kHz)
            QualityTier::Low => 1102,    // MEDIUMBAND (6 kHz)
        }
    }

    pub fn as_int(&self) -> i32 {
        match self {
            QualityTier::High => 2,
            QualityTier::Medium => 1,
            QualityTier::Low => 0,
        }
    }
}

/// Adaptive codec controller state
pub struct AdaptiveCodecController {
    current_tier: QualityTier,
    /// EMA of packet loss rate (0.0-1.0)
    ema_loss: f32,
    /// EMA of RTT in ms
    ema_rtt: f32,
    /// EMA of jitter in ms
    ema_jitter: f32,
    /// Estimated MOS score (1.0-5.0)
    estimated_mos: f64,
    /// Tick counter for rate limiting
    tick: u32,
    /// Number of consecutive ticks at current tier (for hysteresis)
    stability_count: u32,
    /// Minimum ticks at a tier before allowing downgrade (prevents flapping)
    min_stability_ticks: u32,
    /// EMA smoothing factor
    alpha: f32,
}

impl Default for AdaptiveCodecController {
    fn default() -> Self {
        Self::new()
    }
}

impl AdaptiveCodecController {
    pub fn new() -> Self {
        Self {
            current_tier: QualityTier::High, // Start optimistic
            ema_loss: 0.0,
            ema_rtt: 0.0,
            ema_jitter: 0.0,
            estimated_mos: 4.0,
            tick: 0,
            stability_count: 0,
            min_stability_ticks: 75, // 3 seconds at 40ms frames
            alpha: 0.05,              // Very smooth EMA for Tor stability
        }
    }

    /// Update with new network measurements
    pub fn update(&mut self, loss_rate: f32, rtt_ms: f32, jitter_ms: f32) {
        self.ema_loss = (1.0 - self.alpha) * self.ema_loss + self.alpha * loss_rate.clamp(0.0, 1.0);
        self.ema_rtt = (1.0 - self.alpha) * self.ema_rtt + self.alpha * rtt_ms.max(0.0);
        self.ema_jitter = (1.0 - self.alpha) * self.ema_jitter + self.alpha * jitter_ms.max(0.0);

        // Estimate MOS using E-model
        self.estimated_mos = crate::audio::voice_latency_bench::estimate_mos(
            self.ema_rtt as u64,
            self.ema_jitter as u64,
            (self.ema_loss * 100.0) as f64,
            self.current_tier.complexity() as u64, // Rough codec delay proxy
        );

        self.tick = self.tick.wrapping_add(1);
        self.stability_count = self.stability_count.saturating_add(1);
    }

    /// Determine the recommended quality tier based on current metrics
    pub fn recommended_tier(&self) -> QualityTier {
        let loss_pct = self.ema_loss * 100.0;

        // Tor-optimized thresholds: use LOSS ONLY for tier decisions.
        // RTT is unreliable over Tor (multi-hop relay adds 200-800ms inherently)
        // and should NOT cause downgrade.
        if loss_pct > 25.0 {
            QualityTier::Low
        } else if loss_pct > 15.0 {
            QualityTier::Medium
        } else if loss_pct < 8.0 {
            QualityTier::High
        } else {
            self.current_tier // Stay at current tier (hysteresis zone)
        }
    }

    /// Check if we should apply changes (rate-limited to every 2 seconds)
    pub fn should_apply(&self) -> bool {
        self.tick % 50 == 0 // Every 50 frames (2 seconds at 40ms)
    }

    /// Apply tier change to Opus encoder if needed
    /// Returns the new tier if changed, None if unchanged
    pub unsafe fn maybe_update_encoder(
        &mut self,
        encoder_ptr: *mut c_void,
    ) -> Result<Option<QualityTier>, i32> {
        if !self.should_apply() {
            return Ok(None);
        }

        let recommended = self.recommended_tier();

        // Hysteresis: don't change tier unless we've been stable long enough
        if recommended == self.current_tier {
            return Ok(None);
        }

        // Downgrade immediately, upgrade only after stability
        let should_change = if recommended.as_int() < self.current_tier.as_int() {
            true // Downgrade immediately
        } else {
            self.stability_count >= self.min_stability_ticks // Upgrade after stability
        };

        if !should_change {
            return Ok(None);
        }

        // Apply new tier settings
        crate::audio::opus_ctl::opus_set_bitrate(encoder_ptr, recommended.bitrate())?;
        crate::audio::opus_ctl::opus_set_complexity(encoder_ptr, recommended.complexity())?;
        crate::audio::opus_ctl::opus_set_dtx(encoder_ptr, recommended.dtx_enabled()).ok();
        crate::audio::opus_ctl::opus_set_max_bandwidth(encoder_ptr, recommended.max_bandwidth())
            .ok();

        log::info!(
            "Adaptive codec: {:?} → {:?} (loss={:.1}%, RTT={:.0}ms, jitter={:.0}ms, MOS={:.1})",
            self.current_tier,
            recommended,
            self.ema_loss * 100.0,
            self.ema_rtt,
            self.ema_jitter,
            self.estimated_mos
        );

        self.current_tier = recommended;
        self.stability_count = 0;

        Ok(Some(recommended))
    }

    pub fn current_tier(&self) -> QualityTier {
        self.current_tier
    }

    pub fn estimated_mos(&self) -> f64 {
        self.estimated_mos
    }
}

// ============================================================================
// JNI Interface
// ============================================================================

/// Create adaptive codec controller
#[no_mangle]
pub extern "C" fn Java_com_securelegion_crypto_RustBridge_adaptiveCodecCreate(
    _env: JNIEnv,
    _class: JClass,
) -> jlong {
    let controller = AdaptiveCodecController::new();
    let boxed = Box::new(Mutex::new(controller));
    Box::into_raw(boxed) as jlong
}

/// Destroy adaptive codec controller
#[no_mangle]
pub extern "C" fn Java_com_securelegion_crypto_RustBridge_adaptiveCodecDestroy(
    _env: JNIEnv,
    _class: JClass,
    handle: jlong,
) {
    if handle != 0 {
        unsafe {
            let _ = Box::from_raw(handle as *mut Mutex<AdaptiveCodecController>);
        }
    }
}

/// Update adaptive controller with network metrics and apply to encoder
///
/// @param handle Adaptive controller handle
/// @param encoder_handle Opus encoder handle (from opusEncoderCreate)
/// @param loss_rate Packet loss rate 0.0-1.0
/// @param rtt_ms Round-trip time in milliseconds
/// @param jitter_ms Jitter in milliseconds
/// @return Current quality tier (0=LOW, 1=MEDIUM, 2=HIGH), -1 on error
#[no_mangle]
pub extern "C" fn Java_com_securelegion_crypto_RustBridge_adaptiveCodecUpdate(
    _env: JNIEnv,
    _class: JClass,
    handle: jlong,
    encoder_handle: jlong,
    loss_rate: jni::sys::jfloat,
    rtt_ms: jni::sys::jfloat,
    jitter_ms: jni::sys::jfloat,
) -> jint {
    if handle == 0 || encoder_handle == 0 {
        return -1;
    }

    let controller_mutex = unsafe { &*(handle as *const Mutex<AdaptiveCodecController>) };
    let mut controller = match controller_mutex.lock() {
        Ok(c) => c,
        Err(_) => return -1,
    };

    // Update metrics
    controller.update(loss_rate, rtt_ms, jitter_ms);

    // Try to apply to encoder
    unsafe {
        let encoder_mutex = &*(encoder_handle as *const Mutex<*mut c_void>);
        let encoder_ptr = match encoder_mutex.lock() {
            Ok(ptr) => *ptr,
            Err(_) => return -1,
        };

        if encoder_ptr.is_null() {
            return -1;
        }

        match controller.maybe_update_encoder(encoder_ptr) {
            Ok(_) => controller.current_tier().as_int(),
            Err(_) => -1,
        }
    }
}

/// Get estimated MOS score from adaptive controller
/// @return MOS score (1.0-5.0) as float
#[no_mangle]
pub extern "C" fn Java_com_securelegion_crypto_RustBridge_adaptiveCodecGetMOS(
    _env: JNIEnv,
    _class: JClass,
    handle: jlong,
) -> jni::sys::jfloat {
    if handle == 0 {
        return 1.0;
    }

    let controller_mutex = unsafe { &*(handle as *const Mutex<AdaptiveCodecController>) };
    match controller_mutex.lock() {
        Ok(c) => c.estimated_mos() as f32,
        Err(_) => 1.0,
    }
}
