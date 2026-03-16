package com.shieldmessenger.security

import android.util.Log

/**
 * Memory protection utilities.
 *
 * Ensures sensitive data (keys, plaintexts, passwords) is cleared from JVM
 * heap memory as soon as it is no longer needed. This limits the window of
 * exposure to memory-scraping attacks, cold-boot attacks, and core dumps.
 *
 * Usage:
 *   val key = deriveKey(...)
 *   try {
 *       doWork(key)
 *   } finally {
 *       MemoryGuard.wipe(key)
 *   }
 *
 * Or use the [withSecure] scoped helper:
 *   MemoryGuard.withSecure(deriveKey()) { key ->
 *       doWork(key)
 *   }
 */
object MemoryGuard {

    private const val TAG = "MemoryGuard"

    /**
     * Overwrite a byte array with zeros.
     * Call this in a `finally` block after using sensitive key material.
     */
    fun wipe(data: ByteArray?) {
        if (data == null || data.isEmpty()) return
        data.fill(0)
    }

    /**
     * Overwrite a char array with zeros.
     * Useful for password char arrays (e.g. from `EditText.text.toString().toCharArray()`).
     */
    fun wipe(data: CharArray?) {
        if (data == null || data.isEmpty()) return
        data.fill('\u0000')
    }

    /**
     * Overwrite multiple byte arrays at once.
     */
    fun wipeAll(vararg arrays: ByteArray?) {
        for (arr in arrays) wipe(arr)
    }

    /**
     * Scoped helper — executes [block] with [secret], then wipes it regardless
     * of whether the block succeeds or throws.
     *
     * Returns the block's result.
     */
    inline fun <R> withSecure(secret: ByteArray, block: (ByteArray) -> R): R {
        return try {
            block(secret)
        } finally {
            wipe(secret)
        }
    }

    /**
     * Create a defensive copy of sensitive bytes that will be wiped automatically
     * when the [AutoCloseable] is closed.
     *
     * Usage:
     *   SecureBytes(keyData).use { secure ->
     *       doWork(secure.bytes)
     *   } // bytes wiped here
     */
    class SecureBytes(source: ByteArray) : AutoCloseable {
        val bytes: ByteArray = source.copyOf()

        override fun close() {
            wipe(bytes)
            wipe(source = null) // hint: can't wipe original, caller must handle it
        }

        private fun wipe(source: ByteArray?) {
            source?.fill(0)
        }
    }
}
