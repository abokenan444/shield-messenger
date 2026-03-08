package com.shieldmessenger.video

import android.util.Log
import java.nio.ByteBuffer
import java.util.concurrent.ConcurrentHashMap

/**
 * Fragments H.264 NAL units into Tor-friendly sized packets (~1200 bytes)
 * and reassembles them on the receiving end.
 *
 * Fragment header (12 bytes):
 *   frameNumber (4B) | totalFrameSize (4B) | fragmentOffset (2B) | fragmentSize (2B)
 *
 * The first byte of the payload includes flags:
 *   [bit 7: isKeyframe] [bit 6: isFirstFragment] [bit 5: isLastFragment] [bits 0-4: reserved]
 *
 * Battery note: Fragmentation avoids large TCP writes that block for long periods on Tor.
 */
class VideoFramePacketizer {

    companion object {
        private const val TAG = "VideoFramePkt"
        const val MAX_FRAGMENT_SIZE = 1200 // Keep packets small for Tor cells (512 bytes each)
        const val HEADER_SIZE = 13 // 4 + 4 + 2 + 2 + 1 flags byte
    }

    // Reassembly state per frame
    private val pendingFrames = ConcurrentHashMap<Int, FrameAssembly>()
    private var nextExpectedFrame = 0
    private var lastCompletedFrame = -1

    private class FrameAssembly(
        val totalSize: Int,
        val isKeyframe: Boolean,
        val createTime: Long = System.currentTimeMillis()
    ) {
        val fragments = ConcurrentHashMap<Int, ByteArray>() // offset → data
        var receivedSize = 0
    }

    /**
     * Fragment a complete NAL unit into Tor-friendly packets.
     * Returns list of (fragment bytes) ready for encryption and sending.
     */
    fun fragment(nalData: ByteArray, frameNumber: Int, isKeyframe: Boolean): List<ByteArray> {
        val maxPayload = MAX_FRAGMENT_SIZE - HEADER_SIZE
        val fragments = mutableListOf<ByteArray>()
        var offset = 0
        val totalFragments = (nalData.size + maxPayload - 1) / maxPayload

        while (offset < nalData.size) {
            val chunkSize = minOf(maxPayload, nalData.size - offset)
            val isFirst = offset == 0
            val isLast = offset + chunkSize >= nalData.size

            val flags: Byte = (
                (if (isKeyframe) 0x80 else 0) or
                (if (isFirst) 0x40 else 0) or
                (if (isLast) 0x20 else 0)
            ).toByte()

            val packet = ByteBuffer.allocate(HEADER_SIZE + chunkSize)
            packet.putInt(frameNumber)
            packet.putInt(nalData.size) // total frame size
            packet.putShort(offset.toShort())
            packet.putShort(chunkSize.toShort())
            packet.put(flags)
            packet.put(nalData, offset, chunkSize)

            fragments.add(packet.array())
            offset += chunkSize
        }

        if (frameNumber % 30 == 0) {
            Log.d(TAG, "Fragmented frame #$frameNumber: ${nalData.size}B → ${fragments.size} packets" +
                    " (key=$isKeyframe)")
        }

        return fragments
    }

    /**
     * Reassemble a received fragment into a complete frame.
     * Returns the complete NAL data when all fragments are received, null otherwise.
     */
    fun reassemble(fragmentData: ByteArray): ReassembledFrame? {
        if (fragmentData.size < HEADER_SIZE) return null

        val buf = ByteBuffer.wrap(fragmentData)
        val frameNumber = buf.int
        val totalSize = buf.int
        val fragmentOffset = buf.short.toInt() and 0xFFFF
        val fragmentSize = buf.short.toInt() and 0xFFFF
        val flags = buf.get()

        val isKeyframe = (flags.toInt() and 0x80) != 0

        // Validate
        if (totalSize <= 0 || totalSize > 500_000) return null // Max 500KB per frame
        if (fragmentOffset + fragmentSize > totalSize) return null

        // Drop frames that are too old (more than 10 behind current)
        if (frameNumber < lastCompletedFrame - 2) {
            return null // Stale fragment
        }

        // Get or create frame assembly
        val assembly = pendingFrames.getOrPut(frameNumber) {
            FrameAssembly(totalSize, isKeyframe)
        }

        // Store fragment
        val payload = ByteArray(fragmentSize)
        buf.get(payload)
        assembly.fragments[fragmentOffset] = payload
        assembly.receivedSize += fragmentSize

        // Check if complete
        if (assembly.receivedSize >= assembly.totalSize) {
            pendingFrames.remove(frameNumber)
            lastCompletedFrame = maxOf(lastCompletedFrame, frameNumber)

            // Reassemble in order
            val completeData = ByteArray(assembly.totalSize)
            for ((offset, data) in assembly.fragments) {
                System.arraycopy(data, 0, completeData, offset,
                    minOf(data.size, completeData.size - offset))
            }

            // Clean up old pending frames
            cleanupStaleFrames()

            return ReassembledFrame(completeData, frameNumber, assembly.isKeyframe)
        }

        return null
    }

    /**
     * Clean up pending frames that have been waiting too long (>3 seconds).
     */
    private fun cleanupStaleFrames() {
        val now = System.currentTimeMillis()
        val staleKeys = pendingFrames.entries
            .filter { now - it.value.createTime > 3000 }
            .map { it.key }

        for (key in staleKeys) {
            pendingFrames.remove(key)
        }
    }

    fun reset() {
        pendingFrames.clear()
        lastCompletedFrame = -1
        nextExpectedFrame = 0
    }

    data class ReassembledFrame(
        val nalData: ByteArray,
        val frameNumber: Int,
        val isKeyframe: Boolean
    )
}
