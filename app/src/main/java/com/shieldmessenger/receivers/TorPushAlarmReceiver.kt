package com.shieldmessenger.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.shieldmessenger.services.TorSleepManager

/**
 * BroadcastReceiver for Tor Push sleep mode alarms.
 *
 * Handles periodic maintenance wakes triggered by AlarmManager
 * to refresh Tor circuits, update HS descriptors, and process queued messages
 * while keeping the device in deep sleep between wakes.
 *
 * This receiver works in tandem with TorSleepManager and TorService:
 * 1. AlarmManager fires every 15 minutes (works in Doze mode)
 * 2. This receiver wakes TorSleepManager
 * 3. TorSleepManager tells TorService to resume pollers briefly
 * 4. After maintenance window (60s), pollers are paused again
 */
class TorPushAlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "TorPushAlarm"
        const val ACTION_MAINTENANCE_WAKE = "com.shieldmessenger.action.MAINTENANCE_WAKE"
        const val ACTION_COVER_TRAFFIC = "com.shieldmessenger.action.COVER_TRAFFIC"
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_MAINTENANCE_WAKE -> {
                Log.i(TAG, "Maintenance wake alarm received")
                try {
                    val sleepManager = TorSleepManager.getInstance(context)
                    sleepManager.performMaintenance()
                } catch (e: Exception) {
                    Log.e(TAG, "Error during maintenance wake", e)
                }
            }

            ACTION_COVER_TRAFFIC -> {
                Log.d(TAG, "Cover traffic alarm received")
                try {
                    val paddingManager = TrafficPaddingManager.getInstance(context)
                    paddingManager.sendCoverPacket()
                } catch (e: Exception) {
                    Log.e(TAG, "Error sending cover traffic", e)
                }
            }

            else -> {
                Log.w(TAG, "Unknown action: ${intent.action}")
            }
        }
    }
}
