package com.securelegion.utils

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for CrashReport data class.
 *
 * Note: Full CrashReporter integration tests require Android context
 * and are in androidTest. These tests cover the data model.
 */
class CrashReporterTest {

    @Test
    fun `CrashReport data class holds correct values`() {
        val report = CrashReport(
            fileName = "crash_2026-02-26_12-00-00.txt",
            timestamp = 1740567600000L,
            sizeBytes = 2048L,
            filePath = "/data/data/com.securelegion/files/crash_reports/crash_2026-02-26_12-00-00.txt"
        )

        assertEquals("crash_2026-02-26_12-00-00.txt", report.fileName)
        assertEquals(1740567600000L, report.timestamp)
        assertEquals(2048L, report.sizeBytes)
        assertTrue(report.filePath.contains("crash_reports"))
    }

    @Test
    fun `CrashReport equality works correctly`() {
        val report1 = CrashReport("a.txt", 100L, 50L, "/path/a.txt")
        val report2 = CrashReport("a.txt", 100L, 50L, "/path/a.txt")
        val report3 = CrashReport("b.txt", 200L, 60L, "/path/b.txt")

        assertEquals(report1, report2)
        assertTrue(report1 != report3)
    }

    @Test
    fun `CrashReport copy works correctly`() {
        val original = CrashReport("a.txt", 100L, 50L, "/path/a.txt")
        val copy = original.copy(fileName = "b.txt")

        assertEquals("b.txt", copy.fileName)
        assertEquals(100L, copy.timestamp)
    }

    @Test
    fun `CrashReport toString is readable`() {
        val report = CrashReport("crash.txt", 100L, 50L, "/path/crash.txt")
        val str = report.toString()
        assertNotNull(str)
        assertTrue(str.contains("crash.txt"))
    }
}
