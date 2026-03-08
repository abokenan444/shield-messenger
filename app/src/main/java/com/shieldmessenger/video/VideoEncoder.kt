package com.shieldmessenger.video

import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Surface
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Hardware H.264 encoder using MediaCodec for battery-efficient video encoding.
 * Outputs NAL units for streaming over Tor circuits.
 *
 * Battery optimizations:
 * - Hardware encoder (dedicated VPU, not CPU)
 * - Constrained Baseline Profile (lowest decode complexity)
 * - Adaptive bitrate/framerate via VideoBitrateController
 * - Keyframe interval tuned for Tor latency (2s default)
 */
class VideoEncoder(
    private val onEncodedFrame: (nalData: ByteArray, isKeyframe: Boolean, pts: Long) -> Unit
) {
    companion object {
        private const val TAG = "VideoEncoder"
        private const val MIME_TYPE = MediaFormat.MIMETYPE_VIDEO_AVC // H.264
        private const val DEFAULT_WIDTH = 320
        private const val DEFAULT_HEIGHT = 240
        private const val DEFAULT_BITRATE = 200_000 // 200kbps - conservative for Tor
        private const val DEFAULT_FPS = 15
        private const val DEFAULT_IFRAME_INTERVAL = 2 // seconds
    }

    private var encoder: MediaCodec? = null
    private var inputSurface: Surface? = null
    private val isRunning = AtomicBoolean(false)

    @Volatile var width = DEFAULT_WIDTH; private set
    @Volatile var height = DEFAULT_HEIGHT; private set
    @Volatile var bitrate = DEFAULT_BITRATE; private set
    @Volatile var fps = DEFAULT_FPS; private set

    private var encoderThread: Thread? = null

    /**
     * Initialize hardware encoder and return the input Surface for CameraX.
     */
    fun start(width: Int = DEFAULT_WIDTH, height: Int = DEFAULT_HEIGHT,
              bitrate: Int = DEFAULT_BITRATE, fps: Int = DEFAULT_FPS): Surface {
        this.width = width
        this.height = height
        this.bitrate = bitrate
        this.fps = fps

        val format = MediaFormat.createVideoFormat(MIME_TYPE, width, height).apply {
            setInteger(MediaFormat.KEY_COLOR_FORMAT,
                MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface)
            setInteger(MediaFormat.KEY_BIT_RATE, bitrate)
            setInteger(MediaFormat.KEY_FRAME_RATE, fps)
            setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, DEFAULT_IFRAME_INTERVAL)
            setInteger(MediaFormat.KEY_PROFILE,
                MediaCodecInfo.CodecProfileLevel.AVCProfileConstrainedBaseline)
            setInteger(MediaFormat.KEY_LEVEL,
                MediaCodecInfo.CodecProfileLevel.AVCLevel31)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                setInteger(MediaFormat.KEY_MAX_B_FRAMES, 0) // No B-frames - lower latency
            }
            setInteger(MediaFormat.KEY_BITRATE_MODE,
                MediaCodecInfo.EncoderCapabilities.BITRATE_MODE_VBR)
            // Low latency hint for real-time encoding
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                setInteger(MediaFormat.KEY_LOW_LATENCY, 1)
            }
        }

        encoder = MediaCodec.createEncoderByType(MIME_TYPE).apply {
            configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
            inputSurface = createInputSurface()
            start()
        }

        isRunning.set(true)
        startDrainLoop()

        Log.i(TAG, "Encoder started: ${width}x${height} @ ${bitrate/1000}kbps ${fps}fps (hardware H.264)")
        return inputSurface!!
    }

    /**
     * Drain encoded output on a background thread.
     */
    private fun startDrainLoop() {
        encoderThread = Thread({
            val bufferInfo = MediaCodec.BufferInfo()
            val enc = encoder ?: return@Thread

            while (isRunning.get()) {
                val index = enc.dequeueOutputBuffer(bufferInfo, 10_000) // 10ms timeout
                when {
                    index >= 0 -> {
                        val outputBuffer = enc.getOutputBuffer(index) ?: continue
                        if (bufferInfo.size > 0 && (bufferInfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG) == 0) {
                            val nalData = ByteArray(bufferInfo.size)
                            outputBuffer.get(nalData)
                            val isKey = (bufferInfo.flags and MediaCodec.BUFFER_FLAG_KEY_FRAME) != 0
                            onEncodedFrame(nalData, isKey, bufferInfo.presentationTimeUs)
                        }
                        enc.releaseOutputBuffer(index, false)
                    }
                    index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                        Log.d(TAG, "Encoder output format changed: ${enc.outputFormat}")
                    }
                }
            }
        }, "VideoEncoder-Drain").apply {
            priority = Thread.MAX_PRIORITY - 1
            start()
        }
    }

    /**
     * Dynamically adjust bitrate (no encoder restart needed).
     */
    fun updateBitrate(newBitrate: Int) {
        if (newBitrate == bitrate || !isRunning.get()) return
        bitrate = newBitrate
        val params = Bundle().apply {
            putInt(MediaCodec.PARAMETER_KEY_VIDEO_BITRATE, newBitrate)
        }
        try {
            encoder?.setParameters(params)
            Log.d(TAG, "Bitrate updated to ${newBitrate/1000}kbps")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to update bitrate", e)
        }
    }

    /**
     * Request an immediate keyframe (for recovery after packet loss).
     */
    fun requestKeyframe() {
        if (!isRunning.get()) return
        val params = Bundle().apply {
            putInt(MediaCodec.PARAMETER_KEY_REQUEST_SYNC_FRAME, 0)
        }
        try {
            encoder?.setParameters(params)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to request keyframe", e)
        }
    }

    fun stop() {
        isRunning.set(false)
        encoderThread?.join(2000)
        encoderThread = null
        try {
            encoder?.stop()
            encoder?.release()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping encoder", e)
        }
        inputSurface?.release()
        encoder = null
        inputSurface = null
        Log.i(TAG, "Encoder stopped")
    }

    fun getInputSurface(): Surface? = inputSurface

    /**
     * Start encoder in byte buffer input mode (for use with CameraX ImageAnalysis).
     * Feed frames via feedFrame() instead of writing to a Surface.
     */
    fun startBufferMode(width: Int = DEFAULT_WIDTH, height: Int = DEFAULT_HEIGHT,
                        bitrate: Int = DEFAULT_BITRATE, fps: Int = DEFAULT_FPS) {
        this.width = width
        this.height = height
        this.bitrate = bitrate
        this.fps = fps

        val format = MediaFormat.createVideoFormat(MIME_TYPE, width, height).apply {
            setInteger(MediaFormat.KEY_COLOR_FORMAT,
                MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420SemiPlanar)
            setInteger(MediaFormat.KEY_BIT_RATE, bitrate)
            setInteger(MediaFormat.KEY_FRAME_RATE, fps)
            setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, DEFAULT_IFRAME_INTERVAL)
            setInteger(MediaFormat.KEY_BITRATE_MODE,
                MediaCodecInfo.EncoderCapabilities.BITRATE_MODE_VBR)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                setInteger(MediaFormat.KEY_LOW_LATENCY, 1)
            }
        }

        encoder = MediaCodec.createEncoderByType(MIME_TYPE).apply {
            configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
            start()
        }

        isRunning.set(true)
        startDrainLoop()
        Log.i(TAG, "Encoder started (buffer mode): ${width}x${height} @ ${bitrate/1000}kbps ${fps}fps")
    }

    /**
     * Feed a NV12 YUV frame to the encoder (buffer mode only).
     */
    fun feedFrame(yuvData: ByteArray, pts: Long) {
        val enc = encoder ?: return
        if (!isRunning.get()) return

        try {
            val index = enc.dequeueInputBuffer(5_000)
            if (index >= 0) {
                val inputBuffer = enc.getInputBuffer(index) ?: return
                inputBuffer.clear()
                inputBuffer.put(yuvData, 0, minOf(yuvData.size, inputBuffer.capacity()))
                enc.queueInputBuffer(index, 0, yuvData.size, pts, 0)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Feed frame error: ${e.message}")
        }
    }
}
