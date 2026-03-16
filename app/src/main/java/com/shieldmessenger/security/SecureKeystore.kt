package com.shieldmessenger.security

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Hardware-backed key storage using Android Keystore with StrongBox / TEE.
 *
 * Keys generated inside the secure hardware never leave it — all crypto
 * operations execute inside the TEE or StrongBox secure element.
 *
 * This provides the strongest possible protection against:
 * - Root-level attackers reading key material from memory/disk
 * - Physical extraction attacks (StrongBox)
 * - Cold-boot attacks
 */
object SecureKeystore {

    private const val TAG = "SecureKeystore"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val GCM_TAG_LENGTH = 128 // bits

    /**
     * Describes the hardware protection level of a key.
     */
    enum class ProtectionLevel {
        /** Tamper-resistant hardware secure element (highest). */
        STRONGBOX,
        /** Trusted Execution Environment on the main processor. */
        TEE,
        /** Software-only keystore (lowest — still encrypted at rest). */
        SOFTWARE
    }

    /**
     * Determine the best available hardware protection on this device.
     */
    fun bestAvailable(context: Context): ProtectionLevel {
        return when {
            hasStrongBox(context) -> ProtectionLevel.STRONGBOX
            hasTee() -> ProtectionLevel.TEE
            else -> ProtectionLevel.SOFTWARE
        }
    }

    /**
     * Check if StrongBox Keymaster is available (Pixel 3+, Samsung S10+, etc).
     */
    fun hasStrongBox(context: Context): Boolean {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
                context.packageManager.hasSystemFeature(PackageManager.FEATURE_STRONGBOX_KEYSTORE)
    }

    /**
     * Check if TEE-backed Keystore is available (virtually all Android 7+ devices).
     */
    fun hasTee(): Boolean {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.N
    }

    /**
     * Generate (or return existing) AES-256-GCM key with the best available
     * hardware backing. The key never leaves the secure hardware.
     *
     * @param alias Unique alias for this key in the Keystore.
     * @param requireAuth If true, key use requires biometric/screenlock auth.
     */
    fun getOrCreateKey(context: Context, alias: String, requireAuth: Boolean = false): SecretKey {
        val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

        // Return existing key if present
        ks.getEntry(alias, null)?.let { entry ->
            return (entry as KeyStore.SecretKeyEntry).secretKey
        }

        // Generate new key
        val builder = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)

        // Request StrongBox if available
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && hasStrongBox(context)) {
            builder.setIsStrongBoxBacked(true)
            Log.i(TAG, "Key [$alias] will be StrongBox-backed")
        }

        if (requireAuth) {
            builder.setUserAuthenticationRequired(true)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // Require auth within the last 10 seconds
                builder.setUserAuthenticationParameters(10, KeyProperties.AUTH_BIOMETRIC_STRONG)
            }
        }

        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)

        try {
            keyGenerator.init(builder.build())
        } catch (e: Exception) {
            // StrongBox may fail on some OEM implementations — fall back to TEE
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                Log.w(TAG, "StrongBox failed for [$alias], falling back to TEE: ${e.message}")
                builder.setIsStrongBoxBacked(false)
                keyGenerator.init(builder.build())
            } else {
                throw e
            }
        }

        val key = keyGenerator.generateKey()
        Log.i(TAG, "Key [$alias] created, protection=${bestAvailable(context)}")
        return key
    }

    /**
     * Encrypt data using a hardware-backed key. All crypto operations execute
     * inside the TEE/StrongBox — plaintext key material is never in app memory.
     *
     * @return IV (12 bytes) + ciphertext + GCM tag concatenated.
     */
    fun encrypt(context: Context, alias: String, plaintext: ByteArray): ByteArray {
        val key = getOrCreateKey(context, alias)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val iv = cipher.iv // 12 bytes generated by Keystore
        val ciphertext = cipher.doFinal(plaintext)
        // [12-byte IV][ciphertext + tag]
        return iv + ciphertext
    }

    /**
     * Decrypt data using a hardware-backed key.
     *
     * @param data IV (12 bytes) + ciphertext + GCM tag as returned by [encrypt].
     */
    fun decrypt(context: Context, alias: String, data: ByteArray): ByteArray {
        val key = getOrCreateKey(context, alias)
        val iv = data.copyOfRange(0, 12)
        val ciphertext = data.copyOfRange(12, data.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH, iv))
        return cipher.doFinal(ciphertext)
    }

    /**
     * Check whether a key alias exists in the Keystore.
     */
    fun hasKey(alias: String): Boolean {
        return try {
            val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            ks.containsAlias(alias)
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Delete a key from the Keystore.
     */
    fun deleteKey(alias: String) {
        try {
            val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            if (ks.containsAlias(alias)) {
                ks.deleteEntry(alias)
                Log.i(TAG, "Key [$alias] deleted")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete key [$alias]", e)
        }
    }
}
