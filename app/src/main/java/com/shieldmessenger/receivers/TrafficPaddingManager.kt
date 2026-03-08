package com.shieldmessenger.receivers

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.util.Log
import com.shieldmessenger.services.TorSleepManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.security.SecureRandom

/**
 * Traffic Padding Manager for Tor Push Sleep Mode
 *
 * Maintains consistent traffic patterns during sleep to prevent
 * traffic analysis attacks from detecting sleep/wake transitions.
 *
 * When the device is sleeping, this manager sends small cover packets
 * at randomized intervals to make the traffic pattern indistinguishable
 * from normal (awake) operation to a network observer.
 *
 * The Rust-side padding module handles actual packet construction and
 * fixed-size padding. This Kotlin-side manager handles scheduling.
 */
class TrafficPaddingManager(private val context: Context) {

    companion object {
        private const val TAG = "TrafficPadding"

        // Cover traffic timing (randomized to avoid periodic fingerprint)
        const val MIN_COVER_INTERVAL_MS = 20_000L  // 20 seconds minimum
        const val MAX_COVER_INTERVAL_MS = 45_000L  // 45 seconds maximum

        @Volatile
        private var instance: TrafficPaddingManager? = null

        fun getInstance(context: Context): TrafficPaddingManager {
            return instance ?: synchronized(this) {
                instance ?: TrafficPaddingManager(context.applicationContext).also { instance = it }
            }
        }
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val random = SecureRandom()
    private var alarmManager: AlarmManager? = null
    private var coverTrafficEnabled = true
    private var coverPacketsSent = 0L

    fun initialize() {
        alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        Log.i(TAG, "TrafficPaddingManager initialized")
    }

    /**
     * Start sending cover traffic during sleep
     */
    fun startCoverTraffic() {
        if (!coverTrafficEnabled) return
        scheduleCoverTrafficAlarm()
        Log.i(TAG, "Cover traffic started")
    }

    /**
     * Stop cover traffic (when fully awake, natural traffic provides cover)
     */
    fun stopCoverTraffic() {
        cancelCoverTrafficAlarm()
        Log.i(TAG, "Cover traffic stopped (natural traffic active)")
    }

    /**
     * Send a single cover packet
     * Called by TorPushAlarmReceiver when alarm fires
     */
    fun sendCoverPacket() {
        val sleepManager = TorSleepManager.getInstance(context)
        if (sleepManager.currentState != TorSleepManager.SleepState.SLEEPING &&
            sleepManager.currentState != TorSleepManager.SleepState.MAINTENANCE_WAKE) {
            // Not sleeping, don't need cover traffic
            return
        }

        scope.launch {
            try {
                // Use testSocksConnectivity as a lightweight cover packet
                // This creates a small amount of Tor traffic without any payload
                // The Rust-side padding module ensures fixed-size packets
                com.securelegion.crypto.RustBridge.testSocksConnectivity()
                coverPacketsSent++

                if (coverPacketsSent % 10 == 0L) {
                    Log.d(TAG, "Cover packets sent: $coverPacketsSent")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Cover packet failed (expected during deep sleep)", e)
            }
        }

        // Schedule next cover packet with randomized interval
        scheduleCoverTrafficAlarm()
    }

    /**
     * Schedule next cover traffic packet with randomized interval
     */
    @Suppress("MissingPermission")
    private fun scheduleCoverTrafficAlarm() {
        try {
            val intent = Intent(context, TorPushAlarmReceiver::class.java).apply {
                action = TorPushAlarmReceiver.ACTION_COVER_TRAFFIC
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                TorSleepManager.ALARM_COVER_TRAFFIC_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Randomize interval to avoid periodic fingerprint
            val interval = MIN_COVER_INTERVAL_MS +
                    (random.nextDouble() * (MAX_COVER_INTERVAL_MS - MIN_COVER_INTERVAL_MS)).toLong()

            val triggerTime = SystemClock.elapsedRealtime() + interval

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager?.setExactAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            } else {
                alarmManager?.setExact(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule cover traffic alarm", e)
        }
    }

    /**
     * Cancel cover traffic alarm
     */
    private fun cancelCoverTrafficAlarm() {
        try {
            val intent = Intent(context, TorPushAlarmReceiver::class.java).apply {
                action = TorPushAlarmReceiver.ACTION_COVER_TRAFFIC
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                TorSleepManager.ALARM_COVER_TRAFFIC_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager?.cancel(pendingIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel cover traffic alarm", e)
        }
    }

    fun getPacketsSent(): Long = coverPacketsSent

    fun destroy() {
        cancelCoverTrafficAlarm()
        instance = null
    }
}
