package com.securelegion.utils

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for PasswordValidator.
 *
 * These tests verify that the password validation logic correctly enforces
 * the security requirements: minimum length, character diversity, and
 * rejection of weak patterns (sequential numbers, repeated characters).
 */
class PasswordValidatorTest {

    // ─── Valid Passwords ───

    @Test
    fun `strong password passes validation`() {
        val result = PasswordValidator.validate("MyStr0ng!Pass")
        assertTrue("Expected valid password", result.isValid)
    }

    @Test
    fun `password with exactly 8 characters passes`() {
        val result = PasswordValidator.validate("Ab1!cdef")
        assertTrue("8-char password should be valid", result.isValid)
    }

    @Test
    fun `password with unicode special characters passes`() {
        val result = PasswordValidator.validate("Passw0rd@ñ")
        assertTrue("Unicode special chars should be accepted", result.isValid)
    }

    @Test
    fun `long password passes validation`() {
        val result = PasswordValidator.validate("ThisIsAVeryL0ng!Password")
        assertTrue("Long password should be valid", result.isValid)
    }

    // ─── Empty and Short Passwords ───

    @Test
    fun `empty password fails validation`() {
        val result = PasswordValidator.validate("")
        assertFalse("Empty password should fail", result.isValid)
    }

    @Test
    fun `password shorter than 8 characters fails`() {
        val result = PasswordValidator.validate("Ab1!cd")
        assertFalse("Short password should fail", result.isValid)
    }

    @Test
    fun `password with exactly 7 characters fails`() {
        val result = PasswordValidator.validate("Ab1!cde")
        assertFalse("7-char password should fail", result.isValid)
    }

    // ─── Missing Character Classes ───

    @Test
    fun `password without uppercase fails`() {
        val result = PasswordValidator.validate("mystr0ng!pass")
        assertFalse("No uppercase should fail", result.isValid)
    }

    @Test
    fun `password without lowercase fails`() {
        val result = PasswordValidator.validate("MYSTR0NG!PASS")
        assertFalse("No lowercase should fail", result.isValid)
    }

    @Test
    fun `password without digit fails`() {
        val result = PasswordValidator.validate("MyStrong!Pass")
        assertFalse("No digit should fail", result.isValid)
    }

    @Test
    fun `password without special character fails`() {
        val result = PasswordValidator.validate("MyStr0ngPass")
        assertFalse("No special char should fail", result.isValid)
    }

    // ─── Weak Patterns ───

    @Test
    fun `password with sequential numbers ascending fails`() {
        val result = PasswordValidator.validate("Pass123!word")
        assertFalse("Sequential ascending numbers should fail", result.isValid)
    }

    @Test
    fun `password with sequential numbers descending fails`() {
        val result = PasswordValidator.validate("Pass987!word")
        assertFalse("Sequential descending numbers should fail", result.isValid)
    }

    @Test
    fun `password with 4 repeated characters fails`() {
        val result = PasswordValidator.validate("Passaaaa1!")
        assertFalse("4 repeated chars should fail", result.isValid)
    }

    @Test
    fun `password with 3 repeated characters passes`() {
        val result = PasswordValidator.validate("Passaaa1!x")
        assertTrue("3 repeated chars should be allowed", result.isValid)
    }

    @Test
    fun `password with non-sequential numbers passes`() {
        val result = PasswordValidator.validate("Pass1!5x9Yz")
        assertTrue("Non-sequential numbers should pass", result.isValid)
    }

    // ─── Common Weak Passwords ───

    @Test
    fun `common password 'password' fails`() {
        val result = PasswordValidator.validate("password")
        assertFalse("'password' should fail (no uppercase, no digit, no special)", result.isValid)
    }

    @Test
    fun `common password '12345678' fails`() {
        val result = PasswordValidator.validate("12345678")
        assertFalse("'12345678' should fail", result.isValid)
    }

    // ─── ValidationResult ───

    @Test
    fun `valid result has null error message`() {
        val result = PasswordValidator.validate("MyStr0ng!Pass")
        assertTrue(result.isValid)
        assertEquals(null, result.errorMessage)
    }

    @Test
    fun `invalid result has non-null error message`() {
        val result = PasswordValidator.validate("short")
        assertFalse(result.isValid)
        assertTrue("Error message should not be empty", !result.errorMessage.isNullOrEmpty())
    }
}
