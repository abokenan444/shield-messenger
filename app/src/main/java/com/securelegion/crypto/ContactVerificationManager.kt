package com.securelegion.crypto

import android.content.Context
import android.util.Base64
import android.util.Log
import com.securelegion.notifications.NotificationHelper
import org.json.JSONObject

/**
 * ContactVerificationManager — Manages contact identity verification for Shield Messenger.
 *
 * Provides:
 *  - Safety number generation and verification
 *  - QR code fingerprint encoding/decoding
 *  - Identity key change detection with automatic security alerts
 *  - Verified contact state persistence
 *
 * All cryptographic operations are delegated to the Rust core via RustBridge.
 */
object ContactVerificationManager {

    private const val TAG = "SL:Verify"
    private const val PREFS_NAME = "sl_contact_verification"

    // ─── Safety Numbers ───

    /**
     * Generate a 60-digit safety number for verifying a contact.
     * The result is commutative: generate(A, B) == generate(B, A).
     *
     * @param ourIdentityKey Our identity public key (raw bytes)
     * @param theirIdentityKey Their identity public key (raw bytes)
     * @return 12 groups of 5 digits separated by spaces
     */
    fun generateSafetyNumber(
        ourIdentityKey: ByteArray,
        theirIdentityKey: ByteArray,
    ): String {
        return RustBridge.generateSafetyNumber(ourIdentityKey, theirIdentityKey)
    }

    /**
     * Verify a safety number matches two identity keys.
     */
    fun verifySafetyNumber(
        ourIdentityKey: ByteArray,
        theirIdentityKey: ByteArray,
        safetyNumber: String,
    ): Boolean {
        return RustBridge.verifySafetyNumber(ourIdentityKey, theirIdentityKey, safetyNumber)
    }

    // ─── QR Code Verification ───

    /**
     * Generate a QR code payload for in-person verification.
     * Format: "SM-VERIFY:1:<base64-identity>:<safety-number>"
     */
    fun generateQrPayload(
        identityKey: ByteArray,
        safetyNumber: String,
    ): String {
        return RustBridge.encodeFingerprintQr(identityKey, safetyNumber)
    }

    /**
     * Verify a scanned QR code against our identity key.
     *
     * @return VerificationResult with status and optional details
     */
    fun verifyScannedQr(
        ourIdentityKey: ByteArray,
        scannedQrData: String,
    ): VerificationResult {
        val json = RustBridge.verifyContactFingerprint(ourIdentityKey, scannedQrData)
        return try {
            val obj = JSONObject(json)
            when (obj.getString("status")) {
                "Verified" -> VerificationResult.Verified
                "Mismatch" -> VerificationResult.Mismatch
                else -> VerificationResult.InvalidData
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse verification result: $json", e)
            VerificationResult.InvalidData
        }
    }

    // ─── Identity Key Change Detection ───

    /**
     * Check if a contact's identity key has changed since last seen.
     * Automatically triggers a security alert notification if a change is detected.
     *
     * @param context Android context for notifications
     * @param ourIdentityKey Our identity public key
     * @param contactId Unique contact identifier
     * @param contactName Display name for notifications
     * @param currentTheirIdentityKey The contact's current identity key
     * @return IdentityKeyChangeResult describing the change status
     */
    fun checkIdentityKeyChange(
        context: Context,
        ourIdentityKey: ByteArray,
        contactId: String,
        contactName: String,
        currentTheirIdentityKey: ByteArray,
    ): IdentityKeyChangeResult {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val storedKeyB64 = prefs.getString("identity_key_$contactId", null)
        val storedKey = if (storedKeyB64 != null) {
            Base64.decode(storedKeyB64, Base64.NO_WRAP)
        } else {
            ByteArray(0)
        }

        val json = RustBridge.detectIdentityKeyChange(
            ourIdentityKey, storedKey, currentTheirIdentityKey
        )

        val result = try {
            val obj = JSONObject(json)
            when (obj.getString("result")) {
                "FirstSeen" -> IdentityKeyChangeResult.FirstSeen
                "Unchanged" -> IdentityKeyChangeResult.Unchanged
                "Changed" -> IdentityKeyChangeResult.Changed(
                    previousFingerprint = obj.optString("previousFingerprint", ""),
                    newFingerprint = obj.optString("newFingerprint", ""),
                )
                else -> IdentityKeyChangeResult.FirstSeen
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse identity key change result: $json", e)
            IdentityKeyChangeResult.FirstSeen
        }

        // Store the current key for future comparisons
        val currentKeyB64 = Base64.encodeToString(currentTheirIdentityKey, Base64.NO_WRAP)
        prefs.edit().putString("identity_key_$contactId", currentKeyB64).apply()

        // Trigger security alert if key changed
        if (result is IdentityKeyChangeResult.Changed) {
            Log.w(TAG, "IDENTITY KEY CHANGE DETECTED for contact: $contactId")
            NotificationHelper.notifyIdentityKeyChange(context, contactName, contactId)
            // Mark contact as unverified
            markContactUnverified(context, contactId)
        }

        return result
    }

    // ─── Verification State Persistence ───

    /**
     * Mark a contact as verified (safety number confirmed in person).
     */
    fun markContactVerified(context: Context, contactId: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean("verified_$contactId", true)
            .putLong("verified_at_$contactId", System.currentTimeMillis())
            .apply()
        Log.i(TAG, "Contact marked as verified: $contactId")
    }

    /**
     * Mark a contact as unverified (e.g., after identity key change).
     */
    fun markContactUnverified(context: Context, contactId: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean("verified_$contactId", false)
            .remove("verified_at_$contactId")
            .apply()
        Log.i(TAG, "Contact marked as UNVERIFIED: $contactId")
    }

    /**
     * Check if a contact has been verified.
     */
    fun isContactVerified(context: Context, contactId: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean("verified_$contactId", false)
    }

    /**
     * Get the timestamp when a contact was last verified.
     * Returns null if never verified.
     */
    fun getVerificationTimestamp(context: Context, contactId: String): Long? {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val ts = prefs.getLong("verified_at_$contactId", -1)
        return if (ts > 0) ts else null
    }

    // ─── Result Types ───

    sealed class VerificationResult {
        object Verified : VerificationResult()
        object Mismatch : VerificationResult()
        object InvalidData : VerificationResult()
    }

    sealed class IdentityKeyChangeResult {
        object FirstSeen : IdentityKeyChangeResult()
        object Unchanged : IdentityKeyChangeResult()
        data class Changed(
            val previousFingerprint: String,
            val newFingerprint: String,
        ) : IdentityKeyChangeResult()
    }
}
