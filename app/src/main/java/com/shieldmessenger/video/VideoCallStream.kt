package com.shieldmessenger.video

import android.content.Context
import android.util.Log
import android.view.Surface
import android.view.SurfaceHolder
import android.view.SurfaceView
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.securelegion.crypto.RustBridge
import com.shieldmessenger.voice.VoiceCallSession
import com.shieldmessenger.voice.VoiceFrame
import com.shieldmessenger.voice.crypto.VoiceCallCrypto
import kotlinx.coroutines.*
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Manages the full video streaming pipeline for a video call.
 *
 * Encoding: CameraX → Surface → MediaCodec H.264 → fragment → encrypt → Tor circuits
 * Decoding: Tor circuits → decrypt → reassemble → MediaCodec H.264 → SurfaceView
 *
 * Battery optimizations:
 * - Hardware H.264 encode/decode (GPU, not CPU)
 * - Adaptive bitrate controller (adjusts to battery + network)
 * - Frame pacing: skip frames when Tor circuits are congested
 * - Pause when app is backgrounded
 * - Direct Surface rendering (zero-copy decode → display)
 */
class VideoCallStream(
    private val context: Context,
    private val callId: String,
    private val callIdBytes: ByteArray,
    private val crypto: VoiceCallCrypto,
    private val circuitKeys: Map<Int, ByteArray>,
    private val numCircuits: Int,
    private val isOutgoing: Boolean
) {
    companion object {
        private const val TAG = "VideoCallStream"
        private const val PTYPE_VIDEO: Byte = 0x03
        private const val VIDEO_SEQ_OFFSET = 1_000_000 // Offset to avoid collision with audio seq numbers
    }

    private val encoder = VideoEncoder(::onEncodedFrame)
    private var decoder: VideoDecoder? = null
    private val packetizer = VideoFramePacketizer()
    private val bitrateController = VideoBitrateController(context)

    private val isRunning = AtomicBoolean(false)
    private val isPaused = AtomicBoolean(false)
    private val videoSeqNum = AtomicLong(VIDEO_SEQ_OFFSET.toLong())
    private val direction: Byte = if (isOutgoing) 0 else 1
    private var frameNumber = 0

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var bitrateJob: Job? = null

    // Frame pacing - skip frames if send queue is backing up
    @Volatile private var lastFrameSentTime = 0L
    @Volatile private var pendingSends = 0
    private val maxPendingSends = 5 // Drop frames if more than 5 are queued

    // Stats
    @Volatile var framesSent = 0L; private set
    @Volatile var framesReceived = 0L; private set
    @Volatile var framesDropped = 0L; private set
    @Volatile var bytesSent = 0L; private set

    /**
     * Start the video stream.
     * @param remoteSurface Surface to render remote video onto
     */
    fun start(remoteSurface: Surface) {
        val params = bitrateController.getOptimalParams()

        // Start decoder first (for receiving remote video)
        decoder = VideoDecoder { error ->
            Log.e(TAG, "Decoder error: $error")
        }.also {
            it.start(remoteSurface, params.width, params.height)
        }

        // Start encoder in buffer mode (frames fed via feedCameraFrame)
        encoder.startBufferMode(params.width, params.height, params.bitrate, params.fps)

        isRunning.set(true)

        // Start periodic bitrate adaptation (every 3 seconds)
        bitrateJob = scope.launch {
            while (isActive && isRunning.get()) {
                delay(3000)
                adaptBitrate()
            }
        }

        Log.i(TAG, "Video stream started: ${params.width}x${params.height} @ ${params.bitrate/1000}kbps")
    }

    /**
     * Feed a camera frame (NV12 YUV) to the encoder.
     * Called from VideoCallActivity's ImageAnalysis analyzer.
     */
    fun feedCameraFrame(yuvData: ByteArray, pts: Long) {
        if (!isRunning.get() || isPaused.get()) return
        encoder.feedFrame(yuvData, pts)
    }

    fun getEncoderWidth(): Int = encoder.width
    fun getEncoderHeight(): Int = encoder.height

    /**
     * Called by VideoEncoder when a frame is encoded.
     * Fragments, encrypts, and sends over Tor circuits.
     */
    private fun onEncodedFrame(nalData: ByteArray, isKeyframe: Boolean, pts: Long) {
        if (!isRunning.get() || isPaused.get()) return

        // Frame pacing: drop non-keyframes when backed up
        if (!isKeyframe && pendingSends > maxPendingSends) {
            framesDropped++
            if (framesDropped % 10 == 0L) {
                Log.d(TAG, "Video frame drop #$framesDropped (pending=$pendingSends)")
            }
            return
        }

        val currentFrame = frameNumber++
        val fragments = packetizer.fragment(nalData, currentFrame, isKeyframe)

        scope.launch {
            for (fragment in fragments) {
                if (!isRunning.get()) break

                val seqNum = videoSeqNum.getAndIncrement()
                val circuitIndex = (seqNum % numCircuits).toInt()
                val circuitKey = circuitKeys[circuitIndex] ?: continue

                // Encrypt fragment
                val frame = VoiceFrame(
                    callId = callIdBytes,
                    sequenceNumber = seqNum,
                    direction = direction,
                    circuitIndex = circuitIndex,
                    encryptedPayload = ByteArray(0)
                )
                val nonce = crypto.deriveNonce(callIdBytes, seqNum)
                val aad = frame.encodeAAD()
                val encrypted = crypto.encryptFrame(fragment, circuitKey, nonce, aad)

                pendingSends++
                val success = RustBridge.sendAudioPacket(
                    callId, seqNum.toInt(), pts, encrypted, circuitIndex, PTYPE_VIDEO.toInt()
                )
                pendingSends--

                if (success) {
                    bytesSent += encrypted.size
                } else {
                    Log.w(TAG, "Video send failed: seq=$seqNum circuit=$circuitIndex")
                }
            }
            framesSent++
            lastFrameSentTime = System.currentTimeMillis()
        }
    }

    /**
     * Called when a video packet is received from the remote peer.
     * Data is already decrypted by VoiceCallSession. Reassemble and decode.
     */
    fun onVideoPacket(sequence: Int, decryptedData: ByteArray) {
        if (!isRunning.get()) return

        scope.launch {
            try {
                // Reassemble fragments
                val reassembled = packetizer.reassemble(decryptedData) ?: return@launch

                // Feed to decoder
                decoder?.decode(reassembled.nalData, sequence.toLong() * 1000, reassembled.isKeyframe)
                framesReceived++

                if (framesReceived % 30 == 0L) {
                    Log.d(TAG, "Video frames received: $framesReceived")
                }

            } catch (e: Exception) {
                Log.w(TAG, "Video packet error: seq=$sequence", e)
                // On keyframe loss, request recovery
                if (framesReceived > 0 && framesReceived % 30 == 0L) {
                    decoder?.requestRecovery()
                }
            }
        }
    }

    /**
     * Periodically adapt bitrate based on battery and network conditions.
     */
    private fun adaptBitrate() {
        if (!isRunning.get()) return

        val sentRecently = framesSent > 0 && (System.currentTimeMillis() - lastFrameSentTime) < 5000
        val lossRatio = if (framesSent > 0) framesDropped.toFloat() / (framesSent + framesDropped) else 0f

        bitrateController.reportNetworkStats(lossRatio, 0L) // RTT not measured directly

        val params = bitrateController.getOptimalParams()

        // Update bitrate dynamically (no restart needed)
        encoder.updateBitrate(params.bitrate)

        if (bitrateController.needsResolutionChange(encoder.width, encoder.height)) {
            Log.i(TAG, "Resolution change needed: ${encoder.width}x${encoder.height} → ${params.width}x${params.height}")
            // Resolution change requires encoder restart - do it carefully
            // For now, just adjust bitrate. Resolution change on next call.
        }
    }

    /**
     * Pause video (e.g., when app goes to background).
     * Audio continues - only video is paused.
     */
    fun pause() {
        isPaused.set(true)
        Log.d(TAG, "Video paused")
    }

    /**
     * Resume video after pause.
     */
    fun resume() {
        isPaused.set(false)
        encoder.requestKeyframe() // Send keyframe on resume for fast recovery
        Log.d(TAG, "Video resumed (keyframe requested)")
    }

    /**
     * Toggle camera on/off.
     */
    fun setCameraEnabled(enabled: Boolean) {
        if (enabled) {
            resume()
        } else {
            pause()
        }
    }

    fun requestKeyframe() {
        encoder.requestKeyframe()
    }

    fun stop() {
        isRunning.set(false)
        bitrateJob?.cancel()
        encoder.stop()
        decoder?.stop()
        packetizer.reset()
        scope.cancel()
        Log.i(TAG, "Video stream stopped (sent=$framesSent recv=$framesReceived dropped=$framesDropped bytes=${bytesSent/1024}KB)")
    }
}
