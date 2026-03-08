package com.shieldmessenger.video

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.util.Log
import java.util.concurrent.atomic.AtomicInteger

/**
 * Adaptive bitrate controller for video calls over Tor.
 *
 * Monitors battery level, thermal state, and network quality to dynamically
 * adjust video encoding parameters for optimal quality-to-battery tradeoff.
 *
 * Battery optimization tiers:
 * - FULL (>50%):    640x480 @ 15fps, 400kbps
 * - NORMAL (30-50%):320x240 @ 15fps, 250kbps
 * - LOW (15-30%):   320x240 @ 10fps, 150kbps
 * - CRITICAL (<15%):240x180 @ 8fps,  80kbps
 * - SAVER (power save mode): Same as CRITICAL
 */
class VideoBitrateController(private val context: Context) {

    companion object {
        private const val TAG = "VideoBitrateCtrl"

        // Resolution presets
        private val RES_HIGH = Pair(640, 480)
        private val RES_MEDIUM = Pair(320, 240)
        private val RES_LOW = Pair(240, 180)

        // Adaptation thresholds
        private const val PACKET_LOSS_HIGH = 0.15f   // >15% → reduce quality
        private const val PACKET_LOSS_LOW = 0.05f    // <5% → can increase quality
        private const val RTT_HIGH_MS = 2000L        // >2s RTT → reduce quality
        private const val STABILITY_WINDOW_MS = 5000L // 5s of stable metrics to upgrade
    }

    data class VideoParams(
        val width: Int,
        val height: Int,
        val fps: Int,
        val bitrate: Int,
        val keyframeIntervalSec: Int
    )

    enum class QualityTier {
        FULL, NORMAL, LOW, CRITICAL
    }

    @Volatile var currentTier = QualityTier.NORMAL; private set
    private var lastUpgradeTime = 0L
    private var lastDowngradeTime = 0L
    private val consecutiveGoodReports = AtomicInteger(0)
    private val consecutiveBadReports = AtomicInteger(0)

    /**
     * Get current optimal video parameters based on battery + network state.
     */
    fun getOptimalParams(): VideoParams {
        val batteryTier = getBatteryTier()
        val tier = if (batteryTier.ordinal > currentTier.ordinal) batteryTier else currentTier
        currentTier = tier

        return when (tier) {
            QualityTier.FULL -> VideoParams(
                RES_HIGH.first, RES_HIGH.second, 15, 400_000, 2
            )
            QualityTier.NORMAL -> VideoParams(
                RES_MEDIUM.first, RES_MEDIUM.second, 15, 250_000, 2
            )
            QualityTier.LOW -> VideoParams(
                RES_MEDIUM.first, RES_MEDIUM.second, 10, 150_000, 3
            )
            QualityTier.CRITICAL -> VideoParams(
                RES_LOW.first, RES_LOW.second, 8, 80_000, 4
            )
        }
    }

    /**
     * Report network conditions from the call session.
     * Called periodically (every ~2s) to adapt quality.
     */
    fun reportNetworkStats(packetLossRatio: Float, avgRttMs: Long) {
        val now = System.currentTimeMillis()

        if (packetLossRatio > PACKET_LOSS_HIGH || avgRttMs > RTT_HIGH_MS) {
            consecutiveGoodReports.set(0)
            val bad = consecutiveBadReports.incrementAndGet()

            // Downgrade after 2 consecutive bad reports (~4s)
            if (bad >= 2 && currentTier != QualityTier.CRITICAL &&
                now - lastDowngradeTime > 3000) {
                val newTier = QualityTier.entries[
                    (currentTier.ordinal + 1).coerceAtMost(QualityTier.CRITICAL.ordinal)
                ]
                Log.i(TAG, "Quality DOWNGRADE: $currentTier → $newTier (loss=${(packetLossRatio*100).toInt()}% rtt=${avgRttMs}ms)")
                currentTier = newTier
                lastDowngradeTime = now
            }
        } else if (packetLossRatio < PACKET_LOSS_LOW) {
            consecutiveBadReports.set(0)
            val good = consecutiveGoodReports.incrementAndGet()

            // Upgrade after 5 consecutive good reports (~10s of stability)
            val batteryFloor = getBatteryTier()
            if (good >= 5 && currentTier.ordinal > batteryFloor.ordinal &&
                now - lastUpgradeTime > STABILITY_WINDOW_MS) {
                val newTier = QualityTier.entries[
                    (currentTier.ordinal - 1).coerceAtLeast(batteryFloor.ordinal)
                ]
                Log.i(TAG, "Quality UPGRADE: $currentTier → $newTier (loss=${(packetLossRatio*100).toInt()}% rtt=${avgRttMs}ms)")
                currentTier = newTier
                lastUpgradeTime = now
                consecutiveGoodReports.set(0)
            }
        }
    }

    /**
     * Get battery level and map to a quality tier floor.
     */
    private fun getBatteryTier(): QualityTier {
        // Check power save mode first
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
            if (pm?.isPowerSaveMode == true) return QualityTier.CRITICAL
        }

        val batteryLevel = getBatteryLevel()
        return when {
            batteryLevel > 50 -> QualityTier.FULL
            batteryLevel > 30 -> QualityTier.NORMAL
            batteryLevel > 15 -> QualityTier.LOW
            else -> QualityTier.CRITICAL
        }
    }

    private fun getBatteryLevel(): Int {
        val batteryIntent = context.registerReceiver(null,
            IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (level >= 0 && scale > 0) (level * 100) / scale else 50
    }

    /**
     * Check if resolution change is needed (requires encoder restart).
     */
    fun needsResolutionChange(currentWidth: Int, currentHeight: Int): Boolean {
        val params = getOptimalParams()
        return params.width != currentWidth || params.height != currentHeight
    }
}
