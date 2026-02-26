package com.securelegion.utils

import android.content.Context
import android.content.SharedPreferences
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.mockito.Mockito.verify

/**
 * Unit tests for SessionManager.
 *
 * Verifies that the session lock/unlock state is correctly persisted
 * and retrieved via SharedPreferences.
 */
class SessionManagerTest {

    private lateinit var mockContext: Context
    private lateinit var mockPrefs: SharedPreferences
    private lateinit var mockEditor: SharedPreferences.Editor

    @Before
    fun setUp() {
        mockContext = mock(Context::class.java)
        mockPrefs = mock(SharedPreferences::class.java)
        mockEditor = mock(SharedPreferences.Editor::class.java)

        `when`(mockContext.getSharedPreferences("session", Context.MODE_PRIVATE))
            .thenReturn(mockPrefs)
        `when`(mockPrefs.edit()).thenReturn(mockEditor)
        `when`(mockEditor.putBoolean("is_unlocked", true)).thenReturn(mockEditor)
        `when`(mockEditor.putBoolean("is_unlocked", false)).thenReturn(mockEditor)
    }

    @Test
    fun `isUnlocked returns false by default`() {
        `when`(mockPrefs.getBoolean("is_unlocked", false)).thenReturn(false)
        assertFalse("Default state should be locked", SessionManager.isUnlocked(mockContext))
    }

    @Test
    fun `isUnlocked returns true after setUnlocked`() {
        `when`(mockPrefs.getBoolean("is_unlocked", false)).thenReturn(true)
        SessionManager.setUnlocked(mockContext)
        assertTrue("Should be unlocked after setUnlocked", SessionManager.isUnlocked(mockContext))
    }

    @Test
    fun `setLocked writes false to preferences`() {
        SessionManager.setLocked(mockContext)
        verify(mockEditor).putBoolean("is_unlocked", false)
        verify(mockEditor).apply()
    }

    @Test
    fun `setUnlocked writes true to preferences`() {
        SessionManager.setUnlocked(mockContext)
        verify(mockEditor).putBoolean("is_unlocked", true)
        verify(mockEditor).apply()
    }
}
