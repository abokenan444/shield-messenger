package com.shieldmessenger.utils

import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * ANR (Application Not Responding) watchdog.
 *
 * Monitors the main thread for unresponsiveness and logs a diagnostic report
 * when the UI thread is blocked for longer than the configured threshold.
 * This helps identify performance bottlenecks that could lead to ANR dialogs
 * on user devices.
 *
 * The watchdog runs on a background thread and periodically posts a no-op
 * Runnable to the main thread. If the Runnable is not executed within the
 * timeout window, the main thread's stack trace is captured and logged.
 */
object ANRWatchdog {

    private const val TAG = "ANRWatchdog"
    private const val DEFAULT_TIMEOUT_MS = 5_000L // 5 seconds (Android ANR threshold)
    private const val CHECK_INTERVAL_MS = 1_000L  // Check every 1 second

    private var watchThread: Thread? = null
    private var isRunning = false
    private var timeoutMs = DEFAULT_TIMEOUT_MS

    /**
     * Start the ANR watchdog. Should be called from Application.onCreate().
     *
     * @param timeout ANR detection threshold in milliseconds (default: 5000ms)
     */
    fun start(timeout: Long = DEFAULT_TIMEOUT_MS) {
        if (isRunning) return
        timeoutMs = timeout
        isRunning = true

        watchThread = Thread({
            val mainHandler = Handler(Looper.getMainLooper())
            Log.i(TAG, "ANR watchdog started (threshold: ${timeoutMs}ms)")

            while (isRunning && !Thread.currentThread().isInterrupted) {
                try {
                    // Post a flag-toggle to the main thread
                    val responded = java.util.concurrent.atomic.AtomicBoolean(false)
                    mainHandler.post { responded.set(true) }

                    // Wait for the timeout
                    Thread.sleep(timeoutMs)

                    // If the main thread didn't execute our Runnable, it's blocked
                    if (!responded.get()) {
                        val mainThread = Looper.getMainLooper().thread
                        val stackTrace = mainThread.stackTrace

                        val sb = StringBuilder()
                        sb.appendLine("ANR DETECTED — Main thread blocked for >${timeoutMs}ms")
                        sb.appendLine("Thread state: ${mainThread.state}")
                        sb.appendLine("Stack trace:")
                        for (element in stackTrace) {
                            sb.appendLine("    at $element")
                        }

                        Log.e(TAG, sb.toString())

                        // Record as non-fatal crash
                        CrashReporter.recordNonFatal(
                            TAG,
                            "ANR detected: main thread blocked >${timeoutMs}ms",
                            ANRException(stackTrace)
                        )

                        // Wait before checking again to avoid flooding
                        Thread.sleep(timeoutMs * 2)
                    } else {
                        // Main thread is responsive, wait before next check
                        Thread.sleep(CHECK_INTERVAL_MS)
                    }
                } catch (e: InterruptedException) {
                    break
                }
            }

            Log.i(TAG, "ANR watchdog stopped")
        }, "anr-watchdog").apply {
            isDaemon = true
            priority = Thread.MAX_PRIORITY
        }

        watchThread?.start()
    }

    /**
     * Stop the ANR watchdog.
     */
    fun stop() {
        isRunning = false
        watchThread?.interrupt()
        watchThread = null
    }

    /**
     * Custom exception class that carries the main thread's stack trace
     * at the time of ANR detection.
     */
    private class ANRException(mainThreadStack: Array<StackTraceElement>) : Exception("ANR Detected") {
        init {
            stackTrace = mainThreadStack
        }
    }
}
