package com.shieldmessenger.security

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import java.io.File

/**
 * Detects rooted devices, active debuggers, emulators, and hooking frameworks.
 *
 * Uses multiple heuristic checks — no single check is conclusive.
 * The combined score determines the threat level.
 */
object RootDetector {

    private const val TAG = "RootDetector"

    enum class ThreatLevel { SAFE, WARNING, CRITICAL }

    data class SecurityAssessment(
        val threatLevel: ThreatLevel,
        val isRooted: Boolean,
        val isDebugged: Boolean,
        val isEmulator: Boolean,
        val isHooked: Boolean,
        val details: List<String>
    )

    /**
     * Run all checks and return a security assessment.
     */
    fun assess(context: Context): SecurityAssessment {
        val findings = mutableListOf<String>()

        val rooted = checkRoot(findings)
        val debugged = checkDebugger(findings)
        val emulator = checkEmulator(findings)
        val hooked = checkHookingFrameworks(context, findings)

        val level = when {
            hooked || (rooted && debugged) -> ThreatLevel.CRITICAL
            rooted || debugged -> ThreatLevel.WARNING
            emulator -> ThreatLevel.WARNING
            else -> ThreatLevel.SAFE
        }

        val assessment = SecurityAssessment(level, rooted, debugged, emulator, hooked, findings)
        Log.i(TAG, "Assessment: $level (root=$rooted, debug=$debugged, emu=$emulator, hook=$hooked)")
        return assessment
    }

    // ── Root Detection ──────────────────────────────────────────

    private val SU_PATHS = arrayOf(
        "/system/bin/su", "/system/xbin/su", "/sbin/su",
        "/system/su", "/data/local/su", "/data/local/bin/su",
        "/data/local/xbin/su", "/system/sd/xbin/su",
        "/system/bin/failsafe/su", "/vendor/bin/su",
        "/su/bin/su", "/magisk/.core/bin/su"
    )

    private val ROOT_PACKAGES = arrayOf(
        "com.topjohnwu.magisk", "eu.chainfire.supersu",
        "com.koushikdutta.superuser", "com.noshufou.android.su",
        "com.thirdparty.superuser", "com.yellowes.su",
        "com.kingroot.kinguser", "com.kingo.root",
        "com.devadvance.rootcloak", "com.devadvance.rootcloak2",
        "com.amphoras.hidemyroot", "com.saurik.substrate"
    )

    private fun checkRoot(findings: MutableList<String>): Boolean {
        var rooted = false

        // Check su binaries
        for (path in SU_PATHS) {
            if (File(path).exists()) {
                findings.add("su binary found: $path")
                rooted = true
                break
            }
        }

        // Check Build tags
        val tags = Build.TAGS
        if (tags != null && tags.contains("test-keys")) {
            findings.add("Build uses test-keys")
            rooted = true
        }

        // Check root management packages
        for (pkg in ROOT_PACKAGES) {
            if (isPackageInstalled(pkg)) {
                findings.add("Root package installed: $pkg")
                rooted = true
                break
            }
        }

        // Check rw mount on /system
        try {
            val mounts = File("/proc/mounts").readText()
            if (mounts.contains("/system") && mounts.contains(" rw,")) {
                findings.add("/system mounted read-write")
                rooted = true
            }
        } catch (_: Exception) { /* can't read — not a finding */ }

        return rooted
    }

    private var cachedPm: PackageManager? = null

    private fun isPackageInstalled(packageName: String): Boolean {
        return try {
            cachedPm?.getPackageInfo(packageName, 0)
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        }
    }

    // ── Debug Detection ─────────────────────────────────────────

    private fun checkDebugger(findings: MutableList<String>): Boolean {
        var debugged = false

        if (android.os.Debug.isDebuggerConnected()) {
            findings.add("Debugger attached")
            debugged = true
        }

        // Check TracerPid (non-zero means ptrace attached)
        try {
            val status = File("/proc/self/status").readText()
            val tracerLine = status.lines().find { it.startsWith("TracerPid:") }
            val tracerPid = tracerLine?.split(":")?.getOrNull(1)?.trim()?.toIntOrNull() ?: 0
            if (tracerPid != 0) {
                findings.add("Process being traced (TracerPid=$tracerPid)")
                debugged = true
            }
        } catch (_: Exception) { /* ignore */ }

        return debugged
    }

    // ── Emulator Detection ──────────────────────────────────────

    private fun checkEmulator(findings: MutableList<String>): Boolean {
        var score = 0

        if (Build.FINGERPRINT.contains("generic") || Build.FINGERPRINT.contains("unknown")) score++
        if (Build.MODEL.contains("google_sdk") || Build.MODEL.contains("Emulator") ||
            Build.MODEL.contains("Android SDK")) score++
        if (Build.MANUFACTURER.contains("Genymotion")) score++
        if (Build.HARDWARE.contains("goldfish") || Build.HARDWARE.contains("ranchu")) score++
        if (Build.PRODUCT.contains("sdk") || Build.PRODUCT.contains("vbox")) score++
        if (Build.BOARD.equals("unknown", ignoreCase = true)) score++

        // Check for emulator-specific files
        if (File("/dev/socket/qemud").exists() || File("/dev/qemu_pipe").exists()) score++

        val isEmu = score >= 2
        if (isEmu) {
            findings.add("Emulator detected (score=$score)")
        }
        return isEmu
    }

    // ── Hooking Framework Detection ─────────────────────────────

    private val HOOK_PACKAGES = arrayOf(
        "de.robv.android.xposed", "de.robv.android.xposed.installer",
        "com.saurik.substrate", "io.va.exposed",
        "org.meowcat.edxposed.manager", "org.lsposed.manager",
        "top.canyie.dreamland.manager"
    )

    private val HOOK_NATIVE_LIBS = arrayOf(
        "libsubstrate.so", "libxposed_art.so", "libsubstrate-dvm.so",
        "frida-agent", "libfrida-gadget.so"
    )

    private fun checkHookingFrameworks(context: Context, findings: MutableList<String>): Boolean {
        cachedPm = context.packageManager
        var hooked = false

        // Check hooking packages
        for (pkg in HOOK_PACKAGES) {
            if (isPackageInstalled(pkg)) {
                findings.add("Hooking framework: $pkg")
                hooked = true
                break
            }
        }

        // Check for Frida server (listens on default port 27042)
        try {
            val tcp = File("/proc/net/tcp").readText()
            // 69B2 = port 27042 in hex
            if (tcp.contains(":69B2") || tcp.contains(":69b2")) {
                findings.add("Frida server port detected")
                hooked = true
            }
        } catch (_: Exception) { /* ignore */ }

        // Check loaded native libs for hooking signatures
        try {
            val maps = File("/proc/self/maps").readText()
            for (lib in HOOK_NATIVE_LIBS) {
                if (maps.contains(lib)) {
                    findings.add("Hooking library loaded: $lib")
                    hooked = true
                    break
                }
            }
        } catch (_: Exception) { /* ignore */ }

        // Check for Magisk Hide / Zygisk (env variable or namespace)
        try {
            val env = System.getenv()
            if (env.containsKey("MAGISK") || env.containsKey("ZYGISK")) {
                findings.add("Magisk environment variable set")
                hooked = true
            }
        } catch (_: Exception) { /* ignore */ }

        cachedPm = null
        return hooked
    }
}
