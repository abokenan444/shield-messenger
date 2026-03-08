/// AI Noise Suppression using RNNoise (nnnoiseless - pure Rust port)
///
/// Processes audio frames through a recurrent neural network to remove
/// background noise (fans, traffic, keyboard clicks, wind) while preserving
/// speech clarity. Runs entirely on-device — no data leaves the device.
///
/// Architecture:
/// - nnnoiseless processes 480 samples at 48kHz (10ms frames)
/// - Our Opus frames are 1920 samples at 48kHz (40ms)
/// - We process 4 sub-frames per audio frame
///
/// Performance: ~2-5% CPU on modern phones, ~200KB model size
use jni::objects::JClass;
use jni::sys::{jbyteArray, jfloat, jlong};
use jni::JNIEnv;
use nnnoiseless::DenoiseState;
use std::sync::Mutex;

/// RNNoise sub-frame size (10ms at 48kHz)
const RNNOISE_FRAME_SIZE: usize = DenoiseState::FRAME_SIZE; // 480

/// Our Opus frame size (40ms at 48kHz)  
const OPUS_FRAME_SIZE: usize = 1920;

/// Number of RNNoise sub-frames per Opus frame
const SUB_FRAMES: usize = OPUS_FRAME_SIZE / RNNOISE_FRAME_SIZE; // 4

/// Denoiser state wrapper
struct DenoiserHandle {
    state: Box<DenoiseState<'static>>,
    /// Voice Activity Detection probability (0.0-1.0) from last frame
    last_vad: f32,
    /// Whether denoising is enabled (can be toggled at runtime)
    enabled: bool,
    /// Attenuation level (0.0 = full denoise, 1.0 = no denoise)
    /// Allows partial denoising for more natural sound
    mix_ratio: f32,
}

/// Create RNNoise denoiser instance
/// Returns handle or -1 on error
#[no_mangle]
pub extern "C" fn Java_com_securelegion_crypto_RustBridge_denoiserCreate(
    _env: JNIEnv,
    _class: JClass,
) -> jlong {
    let state = DenoiseState::new();
    let handle = DenoiserHandle {
        state,
        last_vad: 0.0,
        enabled: true,
        mix_ratio: 0.0, // Full denoising by default
    };
    let boxed = Box::new(Mutex::new(handle));
    Box::into_raw(boxed) as jlong
}

/// Destroy RNNoise denoiser instance
#[no_mangle]
pub extern "C" fn Java_com_securelegion_crypto_RustBridge_denoiserDestroy(
    _env: JNIEnv,
    _class: JClass,
    handle: jlong,
) {
    if handle != 0 {
        unsafe {
            let _ = Box::from_raw(handle as *mut Mutex<DenoiserHandle>);
        }
    }
}

/// Process PCM audio frame through RNNoise denoiser
///
/// Input: 16-bit PCM samples (1920 samples = 40ms at 48kHz)
/// Output: Denoised 16-bit PCM samples (same size)
///
/// The function processes 4 sub-frames of 480 samples each.
/// Returns denoised audio or null on error.
#[no_mangle]
pub extern "C" fn Java_com_securelegion_crypto_RustBridge_denoiserProcess(
    mut env: JNIEnv,
    _class: JClass,
    handle: jlong,
    pcm_data: jni::objects::JByteArray,
) -> jbyteArray {
    if handle == 0 {
        return std::ptr::null_mut();
    }

    let denoiser_mutex = unsafe { &*(handle as *const Mutex<DenoiserHandle>) };
    let mut denoiser = match denoiser_mutex.lock() {
        Ok(d) => d,
        Err(_) => return std::ptr::null_mut(),
    };

    // Convert JByteArray to Vec<u8>
    let pcm_bytes = match env.convert_byte_array(pcm_data) {
        Ok(bytes) => bytes,
        Err(_) => return std::ptr::null_mut(),
    };

    // Convert bytes to i16 samples
    let num_samples = pcm_bytes.len() / 2;
    if num_samples != OPUS_FRAME_SIZE {
        log::error!(
            "Denoiser: invalid frame size {} (expected {})",
            num_samples,
            OPUS_FRAME_SIZE
        );
        return std::ptr::null_mut();
    }

    let mut pcm_samples = vec![0i16; num_samples];
    for (i, chunk) in pcm_bytes.chunks_exact(2).enumerate() {
        pcm_samples[i] = i16::from_le_bytes([chunk[0], chunk[1]]);
    }

    if !denoiser.enabled {
        // Pass through unchanged
        match env.byte_array_from_slice(&pcm_bytes) {
            Ok(arr) => return arr.into_raw(),
            Err(_) => return std::ptr::null_mut(),
        }
    }

    // Process 4 sub-frames through RNNoise
    let mut output_samples = vec![0i16; num_samples];
    let mut total_vad = 0.0f32;

    for sub in 0..SUB_FRAMES {
        let offset = sub * RNNOISE_FRAME_SIZE;

        // Convert i16 → f32 for RNNoise
        let mut input_f32 = [0.0f32; RNNOISE_FRAME_SIZE];
        for i in 0..RNNOISE_FRAME_SIZE {
            input_f32[i] = pcm_samples[offset + i] as f32;
        }

        // Process through RNNoise neural network
        let mut output_f32 = [0.0f32; RNNOISE_FRAME_SIZE];
        let vad = denoiser.state.process_frame(&mut output_f32, &input_f32);
        total_vad += vad;

        // Apply mix ratio (0.0 = full denoise, 1.0 = bypass)
        let mix = denoiser.mix_ratio;
        for i in 0..RNNOISE_FRAME_SIZE {
            let denoised = output_f32[i];
            let original = input_f32[i];
            let mixed = denoised * (1.0 - mix) + original * mix;
            // Clamp to i16 range
            output_samples[offset + i] =
                mixed.round().clamp(i16::MIN as f32, i16::MAX as f32) as i16;
        }
    }

    // Store average VAD probability
    denoiser.last_vad = total_vad / SUB_FRAMES as f32;

    // Convert output i16 → bytes
    let mut output_bytes = Vec::with_capacity(output_samples.len() * 2);
    for sample in output_samples {
        output_bytes.extend_from_slice(&sample.to_le_bytes());
    }

    match env.byte_array_from_slice(&output_bytes) {
        Ok(arr) => arr.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Get Voice Activity Detection probability from last processed frame
/// Returns 0.0-1.0 (0 = silence/noise only, 1 = speech detected)
#[no_mangle]
pub extern "C" fn Java_com_securelegion_crypto_RustBridge_denoiserGetVAD(
    _env: JNIEnv,
    _class: JClass,
    handle: jlong,
) -> jfloat {
    if handle == 0 {
        return 0.0;
    }

    let denoiser_mutex = unsafe { &*(handle as *const Mutex<DenoiserHandle>) };
    match denoiser_mutex.lock() {
        Ok(d) => d.last_vad,
        Err(_) => 0.0,
    }
}

/// Enable/disable denoising at runtime
/// When disabled, audio passes through unchanged (zero CPU cost)
#[no_mangle]
pub extern "C" fn Java_com_securelegion_crypto_RustBridge_denoiserSetEnabled(
    _env: JNIEnv,
    _class: JClass,
    handle: jlong,
    enabled: jni::sys::jboolean,
) {
    if handle == 0 {
        return;
    }

    let denoiser_mutex = unsafe { &*(handle as *const Mutex<DenoiserHandle>) };
    if let Ok(mut d) = denoiser_mutex.lock() {
        d.enabled = enabled != 0;
        log::info!("Denoiser enabled: {}", d.enabled);
    }
}

/// Set mix ratio for partial denoising
/// 0.0 = full denoise (default), 1.0 = no denoise (bypass)
/// 0.3 = 70% denoised + 30% original (more natural)
#[no_mangle]
pub extern "C" fn Java_com_securelegion_crypto_RustBridge_denoiserSetMixRatio(
    _env: JNIEnv,
    _class: JClass,
    handle: jlong,
    ratio: jfloat,
) {
    if handle == 0 {
        return;
    }

    let denoiser_mutex = unsafe { &*(handle as *const Mutex<DenoiserHandle>) };
    if let Ok(mut d) = denoiser_mutex.lock() {
        d.mix_ratio = ratio.clamp(0.0, 1.0);
        log::info!("Denoiser mix ratio: {}", d.mix_ratio);
    }
}
