package com.shieldmessenger.services

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import com.shieldmessenger.receivers.TorPushAlarmReceiver
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Tor Sleep Mode Manager
 *
 * Implements smart sleep/wake cycles for Tor onion services on mobile devices.
 * Instead of keeping Tor circuits alive 24/7 (battery drain), this manager:
 *
 * 1. Detects when the app is idle (user not interacting)
 * 2. Enters deep sleep, pausing non-critical Tor pollers
 * 3. Schedules periodic maintenance wakes (every 15 min) via AlarmManager
 * 4. During maintenance: refreshes circuits, updates HS descriptors, processes queued messages
 * 5. Wakes fully on incoming message (TCP socket keeps receiving)
 *
 * Privacy: Cover traffic (padding) maintains consistent traffic pattern even during sleep,
 * preventing traffic analysis attacks that could detect sleep/wake transitions.
 *
 * References:
 * - Tor-dev mailing list: timer challenges with Arti on mobile
 * - Briar (Michael Rogers): Java AlarmManager every 15 minutes
 * - USENIX: Tor power consumption feasibility on mobile
 */
class TorSleepManager(private val context: Context) {

    companion object {
        private const val TAG = "TorSleepManager"

        // Sleep mode timing constants
        const val MAINTENANCE_INTERVAL_MS = 15 * 60 * 1000L    // 15 minutes between maintenance wakes
        const val MAINTENANCE_DURATION_MS = 60 * 1000L          // 1 minute maintenance window
        const val IDLE_TIMEOUT_MS = 5 * 60 * 1000L              // 5 minutes idle before sleep
        const val WAKELOCK_TIMEOUT_MS = 90 * 1000L               // 90 second WakeLock max

        // Alarm request codes
        const val ALARM_MAINTENANCE_CODE = 2001
        const val ALARM_COVER_TRAFFIC_CODE = 2002

        // SharedPreferences key
        private const val PREFS_NAME = "tor_sleep_prefs"
        private const val PREF_SLEEP_ENABLED = "sleep_mode_enabled"
        private const val PREF_MAINTENANCE_INTERVAL = "maintenance_interval"

        @Volatile
        private var instance: TorSleepManager? = null

        fun getInstance(context: Context): TorSleepManager {
            return instance ?: synchronized(this) {
                instance ?: TorSleepManager(context.applicationContext).also { instance = it }
            }
        }
    }

    /**
     * Sleep state machine
     */
    enum class SleepState {
        AWAKE,              // Full Tor operation
        ENTERING_SLEEP,     // Flushing pending operations
        SLEEPING,           // Deep sleep - pollers paused
        MAINTENANCE_WAKE,   // Brief wake for circuit maintenance
        WAKING_UP           // Rebuilding state after sleep
    }

    // State
    @Volatile var currentState: SleepState = SleepState.AWAKE
        private set

    private val sleepEnabled = AtomicBoolean(false)
    private val lastActivityTime = AtomicLong(System.currentTimeMillis())
    private val lastMaintenanceTime = AtomicLong(0L)
    private val maintenanceCount = AtomicLong(0)
    private val messagesDuringSleep = AtomicLong(0)
    private val totalSleepMs = AtomicLong(0)
    private var sleepEnteredAt = 0L

    // WakeLock for maintenance windows
    private var maintenanceWakeLock: PowerManager.WakeLock? = null

    // AlarmManager
    private var alarmManager: AlarmManager? = null

    // Callback to TorService for pausing/resuming pollers
    var onSleepStateChanged: ((SleepState) -> Unit)? = null

    /**
     * Initialize the sleep manager
     */
    fun initialize() {
        alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        maintenanceWakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "ShieldMessenger:TorMaintenance"
        )

        // Load persisted setting
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val enabled = prefs.getBoolean(PREF_SLEEP_ENABLED, true) // Enabled by default
        sleepEnabled.set(enabled)

        Log.i(TAG, "TorSleepManager initialized (sleep mode: ${if (enabled) "enabled" else "disabled"})")
    }

    /**
     * Enable or disable sleep mode
     */
    fun setSleepEnabled(enabled: Boolean) {
        sleepEnabled.set(enabled)
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(PREF_SLEEP_ENABLED, enabled)
            .apply()

        if (!enabled && currentState != SleepState.AWAKE) {
            // Disable sleep → force wake
            forceWake("Sleep mode disabled by user")
        }

        Log.i(TAG, "Sleep mode ${if (enabled) "enabled" else "disabled"}")
    }

    fun isSleepEnabled(): Boolean = sleepEnabled.get()

    /**
     * Record user/network activity - resets idle timer
     */
    fun recordActivity() {
        lastActivityTime.set(System.currentTimeMillis())

        if (currentState == SleepState.SLEEPING) {
            messagesDuringSleep.incrementAndGet()
            Log.i(TAG, "Activity during sleep - waking up")
            transitionTo(SleepState.WAKING_UP)
        }
    }

    /**
     * Check if device should enter sleep (called periodically by TorService)
     */
    fun checkIdleTimeout(): Boolean {
        if (!sleepEnabled.get() || currentState != SleepState.AWAKE) {
            return false
        }
        val idleMs = System.currentTimeMillis() - lastActivityTime.get()
        return idleMs >= IDLE_TIMEOUT_MS
    }

    /**
     * Called by TorService when the app goes to background
     */
    fun onAppBackground() {
        if (!sleepEnabled.get()) return

        // Start tracking for sleep transition
        Log.d(TAG, "App moved to background, will check for sleep after ${IDLE_TIMEOUT_MS / 1000}s idle")
    }

    /**
     * Called by TorService when the app comes to foreground
     */
    fun onAppForeground() {
        recordActivity()
        if (currentState != SleepState.AWAKE) {
            forceWake("App returned to foreground")
        }
    }

    /**
     * Enter sleep mode - called when idle timeout exceeded
     */
    fun enterSleep() {
        if (currentState != SleepState.AWAKE) return
        if (!sleepEnabled.get()) return

        Log.i(TAG, "Entering sleep mode (idle for ${(System.currentTimeMillis() - lastActivityTime.get()) / 1000}s)")
        transitionTo(SleepState.ENTERING_SLEEP)

        // Schedule maintenance alarm
        scheduleMaintenanceAlarm()

        // Small delay to flush pending operations, then complete sleep entry
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            if (currentState == SleepState.ENTERING_SLEEP) {
                completeSleepEntry()
            }
        }, 3000) // 3 seconds to flush
    }

    /**
     * Complete sleep entry after flushing
     */
    private fun completeSleepEntry() {
        sleepEnteredAt = System.currentTimeMillis()
        transitionTo(SleepState.SLEEPING)
        Log.i(TAG, "Sleep mode active - pollers paused, maintenance every ${MAINTENANCE_INTERVAL_MS / 60000} min")
    }

    /**
     * Maintenance wake - triggered by AlarmManager
     */
    fun performMaintenance() {
        if (currentState != SleepState.SLEEPING) {
            Log.d(TAG, "Maintenance wake skipped - not sleeping (state: $currentState)")
            return
        }

        Log.i(TAG, "Maintenance wake #${maintenanceCount.get() + 1}")

        // Acquire WakeLock for maintenance window
        try {
            maintenanceWakeLock?.acquire(WAKELOCK_TIMEOUT_MS)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire maintenance WakeLock", e)
        }

        lastMaintenanceTime.set(System.currentTimeMillis())
        maintenanceCount.incrementAndGet()
        transitionTo(SleepState.MAINTENANCE_WAKE)

        // Schedule end of maintenance
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            endMaintenance()
        }, MAINTENANCE_DURATION_MS)

        // Re-schedule next maintenance alarm
        scheduleMaintenanceAlarm()
    }

    /**
     * End maintenance window - return to sleep
     */
    private fun endMaintenance() {
        if (currentState != SleepState.MAINTENANCE_WAKE) return

        Log.i(TAG, "Maintenance complete - returning to sleep")

        // Release WakeLock
        try {
            if (maintenanceWakeLock?.isHeld == true) {
                maintenanceWakeLock?.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to release maintenance WakeLock", e)
        }

        transitionTo(SleepState.SLEEPING)
    }

    /**
     * Force full wake (user opened app, incoming call, etc.)
     */
    fun forceWake(reason: String) {
        if (currentState == SleepState.AWAKE) return

        // Track sleep duration
        if (sleepEnteredAt > 0) {
            totalSleepMs.addAndGet(System.currentTimeMillis() - sleepEnteredAt)
            sleepEnteredAt = 0
        }

        Log.i(TAG, "Force wake: $reason")

        // Release maintenance WakeLock if held
        try {
            if (maintenanceWakeLock?.isHeld == true) {
                maintenanceWakeLock?.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to release WakeLock during force wake", e)
        }

        // Cancel maintenance alarms
        cancelMaintenanceAlarm()

        transitionTo(SleepState.AWAKE)
        lastActivityTime.set(System.currentTimeMillis())
    }

    /**
     * State transition with callback notification
     */
    private fun transitionTo(newState: SleepState) {
        val oldState = currentState
        currentState = newState
        Log.i(TAG, "State: $oldState → $newState")
        onSleepStateChanged?.invoke(newState)
    }

    /**
     * Schedule periodic maintenance wake via AlarmManager
     * Uses setExactAndAllowWhileIdle to work in Doze mode
     */
    @Suppress("MissingPermission")
    private fun scheduleMaintenanceAlarm() {
        try {
            val intent = Intent(context, TorPushAlarmReceiver::class.java).apply {
                action = TorPushAlarmReceiver.ACTION_MAINTENANCE_WAKE
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                ALARM_MAINTENANCE_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val triggerTime = SystemClock.elapsedRealtime() + MAINTENANCE_INTERVAL_MS

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

            Log.d(TAG, "Maintenance alarm scheduled in ${MAINTENANCE_INTERVAL_MS / 60000} minutes")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule maintenance alarm", e)
        }
    }

    /**
     * Cancel maintenance alarms
     */
    private fun cancelMaintenanceAlarm() {
        try {
            val intent = Intent(context, TorPushAlarmReceiver::class.java).apply {
                action = TorPushAlarmReceiver.ACTION_MAINTENANCE_WAKE
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                ALARM_MAINTENANCE_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager?.cancel(pendingIntent)
            Log.d(TAG, "Maintenance alarm cancelled")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel maintenance alarm", e)
        }
    }

    /**
     * Get sleep mode statistics for display
     */
    fun getStats(): SleepStats {
        val currentSleepMs = if (sleepEnteredAt > 0) {
            System.currentTimeMillis() - sleepEnteredAt
        } else 0L

        return SleepStats(
            currentState = currentState,
            sleepEnabled = sleepEnabled.get(),
            maintenanceCount = maintenanceCount.get(),
            totalSleepMinutes = (totalSleepMs.get() + currentSleepMs) / 60000,
            messagesDuringSleep = messagesDuringSleep.get(),
            lastMaintenanceAgo = if (lastMaintenanceTime.get() > 0) {
                (System.currentTimeMillis() - lastMaintenanceTime.get()) / 1000
            } else -1
        )
    }

    /**
     * Clean up resources
     */
    fun destroy() {
        cancelMaintenanceAlarm()
        try {
            if (maintenanceWakeLock?.isHeld == true) {
                maintenanceWakeLock?.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing WakeLock on destroy", e)
        }
        instance = null
    }

    /**
     * Sleep mode statistics
     */
    data class SleepStats(
        val currentState: SleepState,
        val sleepEnabled: Boolean,
        val maintenanceCount: Long,
        val totalSleepMinutes: Long,
        val messagesDuringSleep: Long,
        val lastMaintenanceAgo: Long // seconds ago, or -1
    )
}
