package com.shieldmessenger.video

import android.media.MediaCodec
import android.media.MediaFormat
import android.os.Build
import android.util.Log
import android.view.Surface
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Hardware H.264 decoder using MediaCodec for battery-efficient video decoding.
 * Renders decoded frames directly to a Surface (zero-copy GPU path).
 *
 * Battery optimizations:
 * - Hardware decoder (dedicated VPU)
 * - Direct Surface rendering (no CPU copies)
 * - Frame dropping when behind schedule
 */
class VideoDecoder(
    private val onDecoderError: ((String) -> Unit)? = null
) {
    companion object {
        private const val TAG = "VideoDecoder"
        private const val MIME_TYPE = MediaFormat.MIMETYPE_VIDEO_AVC
    }

    private var decoder: MediaCodec? = null
    private var outputSurface: Surface? = null
    private val isRunning = AtomicBoolean(false)
    private var drainThread: Thread? = null

    // SPS/PPS config data (needed to init decoder before first keyframe)
    private var spsData: ByteArray? = null
    private var ppsData: ByteArray? = null
    @Volatile private var isConfigured = false

    /**
     * Start decoder with an output Surface for rendering.
     */
    fun start(surface: Surface, width: Int = 320, height: Int = 240) {
        outputSurface = surface

        val format = MediaFormat.createVideoFormat(MIME_TYPE, width, height).apply {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                setInteger(MediaFormat.KEY_LOW_LATENCY, 1)
            }
        }

        decoder = MediaCodec.createDecoderByType(MIME_TYPE).apply {
            configure(format, surface, null, 0)
            start()
        }

        isRunning.set(true)
        isConfigured = true
        startDrainLoop()
        Log.i(TAG, "Decoder started: ${width}x${height} → Surface")
    }

    /**
     * Feed an encoded NAL unit to the decoder.
     */
    fun decode(nalData: ByteArray, pts: Long, isKeyframe: Boolean) {
        val dec = decoder ?: return
        if (!isRunning.get()) return

        // Extract SPS/PPS from keyframes for recovery
        if (isKeyframe) {
            extractSpsPps(nalData)
        }

        try {
            val inputIndex = dec.dequeueInputBuffer(5_000) // 5ms timeout
            if (inputIndex >= 0) {
                val inputBuffer = dec.getInputBuffer(inputIndex) ?: return
                inputBuffer.clear()
                inputBuffer.put(nalData)
                val flags = if (isKeyframe) MediaCodec.BUFFER_FLAG_KEY_FRAME else 0
                dec.queueInputBuffer(inputIndex, 0, nalData.size, pts, flags)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Decode error: ${e.message}")
            onDecoderError?.invoke(e.message ?: "Unknown decode error")
        }
    }

    /**
     * Extract SPS and PPS NAL units from keyframe data for decoder recovery.
     */
    private fun extractSpsPps(nalData: ByteArray) {
        var i = 0
        while (i < nalData.size - 4) {
            // Look for start codes (0x00 0x00 0x00 0x01)
            if (nalData[i] == 0.toByte() && nalData[i+1] == 0.toByte() &&
                nalData[i+2] == 0.toByte() && nalData[i+3] == 1.toByte()) {
                val nalType = nalData.getOrNull(i + 4)?.toInt()?.and(0x1F) ?: break
                if (nalType == 7) { // SPS
                    val end = findNextStartCode(nalData, i + 4)
                    spsData = nalData.copyOfRange(i, end)
                } else if (nalType == 8) { // PPS
                    val end = findNextStartCode(nalData, i + 4)
                    ppsData = nalData.copyOfRange(i, end)
                }
            }
            i++
        }
    }

    private fun findNextStartCode(data: ByteArray, start: Int): Int {
        for (i in start until data.size - 3) {
            if (data[i] == 0.toByte() && data[i+1] == 0.toByte() &&
                data[i+2] == 0.toByte() && data[i+3] == 1.toByte()) {
                return i
            }
        }
        return data.size
    }

    /**
     * Drain decoded frames to the Surface on a background thread.
     */
    private fun startDrainLoop() {
        drainThread = Thread({
            val bufferInfo = MediaCodec.BufferInfo()
            val dec = decoder ?: return@Thread

            while (isRunning.get()) {
                try {
                    val index = dec.dequeueOutputBuffer(bufferInfo, 10_000) // 10ms
                    if (index >= 0) {
                        // Render to Surface (release with render=true)
                        dec.releaseOutputBuffer(index, bufferInfo.size > 0)
                    }
                } catch (e: Exception) {
                    if (isRunning.get()) {
                        Log.w(TAG, "Drain error: ${e.message}")
                    }
                }
            }
        }, "VideoDecoder-Drain").apply {
            priority = Thread.MAX_PRIORITY - 1
            start()
        }
    }

    /**
     * Request keyframe recovery by re-feeding SPS/PPS to decoder.
     */
    fun requestRecovery() {
        val sps = spsData ?: return
        val pps = ppsData ?: return
        val configData = sps + pps
        decode(configData, 0, true)
        Log.d(TAG, "Recovery: re-fed SPS(${sps.size}B) + PPS(${pps.size}B)")
    }

    fun stop() {
        isRunning.set(false)
        drainThread?.join(2000)
        drainThread = null
        try {
            decoder?.stop()
            decoder?.release()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping decoder", e)
        }
        decoder = null
        isConfigured = false
        Log.i(TAG, "Decoder stopped")
    }

    fun isReady(): Boolean = isConfigured && isRunning.get()
}
