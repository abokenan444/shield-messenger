package com.shieldmessenger.security

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Central endpoint-protection orchestrator.
 *
 * Runs all security checks at app startup and exposes the results for
 * UI-level decisions (warnings, feature-gating, or shutdown).
 *
 * Layers:
 *  1. Root / debug / emulator / hooking detection  → [RootDetector]
 *  2. APK integrity (signing cert)                  → [IntegrityChecker]
 *  3. Hardware-backed Keystore availability          → [SecureKeystore]
 *  4. Memory-safe data handling                      → [MemoryGuard]
 */
object EndpointProtection {

    private const val TAG = "EndpointProtection"

    /** Cached result from the last [runChecks] invocation. */
    @Volatile
    var lastAssessment: RootDetector.SecurityAssessment? = null
        private set

    @Volatile
    var lastIntegrity: IntegrityChecker.IntegrityResult? = null
        private set

    @Volatile
    var keystoreLevel: SecureKeystore.ProtectionLevel? = null
        private set

    /** Guard: show the security warning at most once per app session. */
    @Volatile
    private var warningShownThisSession = false

    /**
     * Run all endpoint-protection checks on a background thread.
     * Safe to call from Application.onCreate().
     */
    fun runChecks(context: Context) {
        CoroutineScope(Dispatchers.Default).launch {
            try {
                // 1. Root / debug / hook assessment
                lastAssessment = RootDetector.assess(context)

                // 2. APK integrity (enrollment mode — we log the hash, no expected value yet)
                //    To enforce, set expectedSha256 to the production cert hash.
                lastIntegrity = IntegrityChecker.verify(context)

                // 3. Keystore hardware level
                keystoreLevel = SecureKeystore.bestAvailable(context)

                Log.i(TAG, buildSummary())
            } catch (e: Exception) {
                Log.e(TAG, "Endpoint protection checks failed", e)
            }
        }
    }

    /**
     * Show a non-blocking security warning dialog if the device is compromised.
     * Call from Activity.onResume() of sensitive screens (chat, wallet, settings).
     *
     * Returns true if a warning was shown.
     */
    fun showWarningIfNeeded(activity: Activity): Boolean {
        if (warningShownThisSession) return false
        val assessment = lastAssessment ?: return false

        if (assessment.threatLevel == RootDetector.ThreatLevel.SAFE) return false

        val title: String
        val message: String

        when (assessment.threatLevel) {
            RootDetector.ThreatLevel.CRITICAL -> {
                title = "⚠️ Security Alert"
                message = buildString {
                    append("Your device may be compromised. Shield Messenger's security ")
                    append("cannot be guaranteed:\n\n")
                    for (detail in assessment.details) {
                        append("• $detail\n")
                    }
                    append("\nSensitive features may be disabled for your protection.")
                }
            }
            RootDetector.ThreatLevel.WARNING -> {
                title = "Security Notice"
                message = buildString {
                    append("Potential security concern detected:\n\n")
                    for (detail in assessment.details) {
                        append("• $detail\n")
                    }
                    append("\nSome security guarantees may be reduced.")
                }
            }
            else -> return false
        }

        try {
            AlertDialog.Builder(activity)
                .setTitle(title)
                .setMessage(message)
                .setPositiveButton("I Understand") { dialog, _ -> dialog.dismiss() }
                .setCancelable(true)
                .show()
            warningShownThisSession = true
        } catch (e: Exception) {
            Log.e(TAG, "Could not show security warning", e)
            return false
        }

        return true
    }

    /**
     * Whether the device passes minimum security requirements.
     */
    fun isDeviceSecure(): Boolean {
        val assessment = lastAssessment ?: return true // not yet assessed
        return assessment.threatLevel != RootDetector.ThreatLevel.CRITICAL
    }

    /**
     * Build a one-line summary for logging.
     */
    private fun buildSummary(): String {
        val a = lastAssessment
        val i = lastIntegrity
        val k = keystoreLevel
        return "Endpoint: threat=${a?.threatLevel}, integrity=${i?.isValid}, " +
                "keystore=$k, root=${a?.isRooted}, debug=${a?.isDebugged}, " +
                "hook=${a?.isHooked}, emu=${a?.isEmulator}"
    }
}
