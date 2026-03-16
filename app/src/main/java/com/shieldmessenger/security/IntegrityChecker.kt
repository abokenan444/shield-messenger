package com.shieldmessenger.security

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import android.util.Log
import java.security.MessageDigest

/**
 * Verifies the APK has not been repackaged or tampered with at runtime.
 *
 * Compares the app's signing certificate hash against the expected production hash.
 * If the app has been modified and re-signed with a different key, the check fails.
 */
object IntegrityChecker {

    private const val TAG = "IntegrityChecker"

    /**
     * Result of an integrity check.
     */
    data class IntegrityResult(
        val isValid: Boolean,
        val signatureHash: String?,
        val reason: String?
    )

    /**
     * Verify the APK signing certificate matches the expected hash.
     *
     * @param context Application context.
     * @param expectedSha256 The expected SHA-256 hash of the signing cert (Base64).
     *                       Pass null to skip (returns the current hash for enrollment).
     * @return IntegrityResult with match status and current hash.
     */
    fun verify(context: Context, expectedSha256: String? = null): IntegrityResult {
        return try {
            val currentHash = getSigningCertHash(context)
                ?: return IntegrityResult(false, null, "Could not read signing certificate")

            if (expectedSha256 == null) {
                // Enrollment mode — just return current hash
                Log.i(TAG, "Signing cert SHA-256: $currentHash")
                return IntegrityResult(true, currentHash, "Enrollment — no expected hash provided")
            }

            if (currentHash == expectedSha256) {
                IntegrityResult(true, currentHash, null)
            } else {
                Log.e(TAG, "INTEGRITY FAIL: expected=$expectedSha256, actual=$currentHash")
                IntegrityResult(false, currentHash, "Signing certificate mismatch — possible repackaging")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Integrity check error", e)
            IntegrityResult(false, null, "Integrity check failed: ${e.message}")
        }
    }

    /**
     * Check if the app is a debuggable build (debug flag set in manifest).
     */
    fun isDebuggableBuild(context: Context): Boolean {
        return try {
            val appInfo = context.applicationInfo
            (appInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Check if the installer is from a trusted source (Google Play, F-Droid, etc).
     */
    fun getInstallerPackage(context: Context): String? {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                context.packageManager
                    .getInstallSourceInfo(context.packageName)
                    .installingPackageName
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getInstallerPackageName(context.packageName)
            }
        } catch (_: Exception) {
            null
        }
    }

    // ── Internal ────────────────────────────────────────────────

    @Suppress("DEPRECATION")
    private fun getSigningCertHash(context: Context): String? {
        return try {
            val pm = context.packageManager
            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val signingInfo = pm.getPackageInfo(
                    context.packageName,
                    PackageManager.GET_SIGNING_CERTIFICATES
                ).signingInfo
                if (signingInfo?.hasMultipleSigners() == true) {
                    signingInfo.apkContentsSigners
                } else {
                    signingInfo?.signingCertificateHistory
                }
            } else {
                pm.getPackageInfo(
                    context.packageName,
                    PackageManager.GET_SIGNATURES
                ).signatures
            }

            val sig = signatures?.firstOrNull() ?: return null
            val digest = MessageDigest.getInstance("SHA-256")
            val hash = digest.digest(sig.toByteArray())
            Base64.encodeToString(hash, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.e(TAG, "getSigningCertHash failed", e)
            null
        }
    }
}
