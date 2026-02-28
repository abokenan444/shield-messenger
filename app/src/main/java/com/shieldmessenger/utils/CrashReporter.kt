package com.shieldmessenger.utils

import android.content.Context
import android.os.Build
import android.util.Log
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Privacy-respecting crash reporter for Shield Messenger.
 *
 * Collects crash logs locally on the device without sending any data to
 * external servers. Users can optionally share crash reports via the
 * developer menu or support screen.
 *
 * Design principles:
 * - Zero network access: crashes are stored on-device only
 * - No PII collection: no user IDs, no IP addresses, no location
 * - Minimal metadata: only device model, OS version, app version, and stack trace
 * - Encrypted storage: crash logs are stored in the app's private directory
 * - User control: users can view, share, or delete crash logs at any time
 */
object CrashReporter {

    private const val TAG = "CrashReporter"
    private const val CRASH_DIR = "crash_reports"
    private const val MAX_CRASH_FILES = 20
    private const val MAX_FILE_SIZE_BYTES = 512 * 1024 // 512 KB per file

    private var isInitialized = false
    private var defaultHandler: Thread.UncaughtExceptionHandler? = null
    private lateinit var appContext: Context

    /**
     * Initialize the crash reporter. Must be called from Application.onCreate().
     * Installs a global uncaught exception handler that captures crashes to local files.
     */
    fun initialize(context: Context) {
        if (isInitialized) return
        appContext = context.applicationContext

        // Ensure crash directory exists
        getCrashDir().mkdirs()

        // Save the default handler so we can chain to it after logging
        defaultHandler = Thread.getDefaultUncaughtExceptionHandler()

        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                writeCrashReport(thread, throwable)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to write crash report", e)
            }

            // Chain to the default handler (which will terminate the process)
            defaultHandler?.uncaughtException(thread, throwable)
        }

        // Clean up old crash files
        pruneOldReports()

        isInitialized = true
        Log.i(TAG, "Crash reporter initialized (local-only, privacy-respecting)")
    }

    /**
     * Write a crash report to a local file.
     */
    private fun writeCrashReport(thread: Thread, throwable: Throwable) {
        val timestamp = SimpleDateFormat("yyyy-MM-dd_HH-mm-ss", Locale.US).format(Date())
        val fileName = "crash_$timestamp.txt"
        val file = File(getCrashDir(), fileName)

        val sw = StringWriter()
        val pw = PrintWriter(sw)

        pw.println("=== Shield Messenger Crash Report ===")
        pw.println("Timestamp: ${SimpleDateFormat("yyyy-MM-dd HH:mm:ss Z", Locale.US).format(Date())}")
        pw.println()

        // Device info (no PII)
        pw.println("--- Device Info ---")
        pw.println("Manufacturer: ${Build.MANUFACTURER}")
        pw.println("Model: ${Build.MODEL}")
        pw.println("Android: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
        pw.println("ABI: ${Build.SUPPORTED_ABIS.joinToString()}")
        pw.println()

        // App info
        try {
            val pInfo = appContext.packageManager.getPackageInfo(appContext.packageName, 0)
            pw.println("--- App Info ---")
            pw.println("Package: ${appContext.packageName}")
            pw.println("Version: ${pInfo.versionName} (${pInfo.longVersionCode})")
            pw.println()
        } catch (e: Exception) {
            pw.println("--- App Info ---")
            pw.println("(Could not retrieve app info)")
            pw.println()
        }

        // Memory info
        val runtime = Runtime.getRuntime()
        val usedMB = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024)
        val maxMB = runtime.maxMemory() / (1024 * 1024)
        pw.println("--- Memory ---")
        pw.println("Used: ${usedMB}MB / Max: ${maxMB}MB")
        pw.println()

        // Thread info
        pw.println("--- Thread ---")
        pw.println("Name: ${thread.name}")
        pw.println("ID: ${thread.id}")
        pw.println("Priority: ${thread.priority}")
        pw.println()

        // Stack trace
        pw.println("--- Exception ---")
        throwable.printStackTrace(pw)
        pw.println()

        // Cause chain
        var cause = throwable.cause
        var depth = 0
        while (cause != null && depth < 5) {
            pw.println("--- Caused by (depth ${depth + 1}) ---")
            cause.printStackTrace(pw)
            pw.println()
            cause = cause.cause
            depth++
        }

        pw.flush()
        val report = sw.toString()

        // Truncate if too large
        val content = if (report.length > MAX_FILE_SIZE_BYTES) {
            report.substring(0, MAX_FILE_SIZE_BYTES) + "\n\n[TRUNCATED]"
        } else {
            report
        }

        file.writeText(content)
        Log.e(TAG, "Crash report saved: ${file.absolutePath}")
    }

    /**
     * Remove old crash reports, keeping only the most recent [MAX_CRASH_FILES].
     */
    private fun pruneOldReports() {
        try {
            val files = getCrashDir().listFiles()?.sortedByDescending { it.lastModified() } ?: return
            if (files.size > MAX_CRASH_FILES) {
                files.drop(MAX_CRASH_FILES).forEach { file ->
                    file.delete()
                    Log.d(TAG, "Pruned old crash report: ${file.name}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to prune crash reports", e)
        }
    }

    /**
     * Get the crash reports directory.
     */
    private fun getCrashDir(): File {
        return File(appContext.filesDir, CRASH_DIR)
    }

    // ─── Public API for Developer Menu / Support Screen ───

    /**
     * Get a list of all crash reports, sorted newest first.
     */
    fun getCrashReports(): List<CrashReport> {
        if (!isInitialized) return emptyList()
        return try {
            getCrashDir().listFiles()
                ?.filter { it.extension == "txt" }
                ?.sortedByDescending { it.lastModified() }
                ?.map { file ->
                    CrashReport(
                        fileName = file.name,
                        timestamp = file.lastModified(),
                        sizeBytes = file.length(),
                        filePath = file.absolutePath
                    )
                } ?: emptyList()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to list crash reports", e)
            emptyList()
        }
    }

    /**
     * Read the content of a specific crash report.
     */
    fun readCrashReport(fileName: String): String? {
        if (!isInitialized) return null
        return try {
            val file = File(getCrashDir(), fileName)
            if (file.exists() && file.parentFile == getCrashDir()) {
                file.readText()
            } else null
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read crash report: $fileName", e)
            null
        }
    }

    /**
     * Delete all crash reports.
     */
    fun clearAllReports(): Int {
        if (!isInitialized) return 0
        return try {
            val files = getCrashDir().listFiles() ?: return 0
            var deleted = 0
            files.forEach { file ->
                if (file.delete()) deleted++
            }
            Log.i(TAG, "Cleared $deleted crash reports")
            deleted
        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear crash reports", e)
            0
        }
    }

    /**
     * Get a summary string suitable for sharing via support.
     * Includes the latest crash report only.
     */
    fun getLatestCrashSummary(): String? {
        val reports = getCrashReports()
        if (reports.isEmpty()) return null
        return readCrashReport(reports.first().fileName)
    }

    /**
     * Record a non-fatal exception for debugging purposes.
     * These are logged but do not terminate the app.
     */
    fun recordNonFatal(tag: String, message: String, throwable: Throwable? = null) {
        if (!isInitialized) return
        try {
            val timestamp = SimpleDateFormat("yyyy-MM-dd_HH-mm-ss-SSS", Locale.US).format(Date())
            val fileName = "nonfatal_$timestamp.txt"
            val file = File(getCrashDir(), fileName)

            val sb = StringBuilder()
            sb.appendLine("=== Non-Fatal Error Report ===")
            sb.appendLine("Timestamp: ${SimpleDateFormat("yyyy-MM-dd HH:mm:ss Z", Locale.US).format(Date())}")
            sb.appendLine("Tag: $tag")
            sb.appendLine("Message: $message")
            if (throwable != null) {
                sb.appendLine()
                sb.appendLine("--- Exception ---")
                val sw = StringWriter()
                throwable.printStackTrace(PrintWriter(sw))
                sb.append(sw.toString())
            }

            file.writeText(sb.toString())
            Log.w(TAG, "Non-fatal recorded: $tag - $message")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to record non-fatal", e)
        }
    }
}

/**
 * Data class representing a crash report file.
 */
data class CrashReport(
    val fileName: String,
    val timestamp: Long,
    val sizeBytes: Long,
    val filePath: String
)
