package com.shieldmessenger.utils

import android.content.Context
import android.util.Base64
import java.security.SecureRandom
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.math.pow

/**
 * TOTP (Time-Based One-Time Password) implementation following RFC 6238.
 * Uses HMAC-SHA1 with 6-digit codes and a 30-second time step.
 */
object TotpHelper {

    private const val PREFS_NAME = "totp_prefs"
    private const val KEY_SECRET = "totp_secret"
    private const val KEY_ENABLED = "totp_enabled"
    private const val DIGITS = 6
    private const val TIME_STEP_SECONDS = 30L
    private const val ALGORITHM = "HmacSHA1"

    /**
     * Generate a new random 20-byte secret for TOTP enrollment.
     */
    fun generateSecret(): ByteArray {
        val secret = ByteArray(20)
        SecureRandom().nextBytes(secret)
        return secret
    }

    /**
     * Encode secret bytes to Base32 (RFC 4648) for use in otpauth:// URIs.
     */
    fun encodeBase32(data: ByteArray): String {
        val alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
        val result = StringBuilder()
        var buffer = 0
        var bitsLeft = 0
        for (b in data) {
            buffer = (buffer shl 8) or (b.toInt() and 0xFF)
            bitsLeft += 8
            while (bitsLeft >= 5) {
                val index = (buffer shr (bitsLeft - 5)) and 0x1F
                result.append(alphabet[index])
                bitsLeft -= 5
            }
        }
        if (bitsLeft > 0) {
            val index = (buffer shl (5 - bitsLeft)) and 0x1F
            result.append(alphabet[index])
        }
        return result.toString()
    }

    /**
     * Generate TOTP code for a given secret and time.
     */
    fun generateCode(secret: ByteArray, timeMillis: Long = System.currentTimeMillis()): String {
        val counter = timeMillis / 1000 / TIME_STEP_SECONDS
        val counterBytes = ByteArray(8)
        var value = counter
        for (i in 7 downTo 0) {
            counterBytes[i] = (value and 0xFF).toByte()
            value = value shr 8
        }

        val mac = Mac.getInstance(ALGORITHM)
        mac.init(SecretKeySpec(secret, ALGORITHM))
        val hash = mac.doFinal(counterBytes)

        val offset = hash[hash.size - 1].toInt() and 0x0F
        val binary = ((hash[offset].toInt() and 0x7F) shl 24) or
                     ((hash[offset + 1].toInt() and 0xFF) shl 16) or
                     ((hash[offset + 2].toInt() and 0xFF) shl 8) or
                     (hash[offset + 3].toInt() and 0xFF)

        val otp = binary % 10.0.pow(DIGITS).toInt()
        return otp.toString().padStart(DIGITS, '0')
    }

    /**
     * Verify a TOTP code against the secret, allowing ±1 time step window.
     */
    fun verifyCode(secret: ByteArray, code: String, timeMillis: Long = System.currentTimeMillis()): Boolean {
        // Allow 1 step before and after for clock drift
        for (offset in -1..1) {
            val adjustedTime = timeMillis + (offset * TIME_STEP_SECONDS * 1000)
            if (generateCode(secret, adjustedTime) == code) {
                return true
            }
        }
        return false
    }

    /**
     * Build an otpauth:// URI for QR code generation.
     */
    fun buildOtpAuthUri(secret: ByteArray, accountName: String): String {
        val base32Secret = encodeBase32(secret)
        val encodedAccount = android.net.Uri.encode(accountName)
        return "otpauth://totp/ShieldMessenger:$encodedAccount?secret=$base32Secret&issuer=ShieldMessenger&algorithm=SHA1&digits=$DIGITS&period=$TIME_STEP_SECONDS"
    }

    // --- Persistence methods ---

    fun isEnabled(context: Context): Boolean {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_ENABLED, false)
    }

    fun saveSecret(context: Context, secret: ByteArray) {
        val encoded = Base64.encodeToString(secret, Base64.NO_WRAP)
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_SECRET, encoded)
            .putBoolean(KEY_ENABLED, true)
            .apply()
    }

    fun getSecret(context: Context): ByteArray? {
        val encoded = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_SECRET, null) ?: return null
        return Base64.decode(encoded, Base64.NO_WRAP)
    }

    fun disable(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_SECRET)
            .putBoolean(KEY_ENABLED, false)
            .apply()
    }
}
