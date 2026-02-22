/**
 * Tests for server crypto utilities: encryptField, decryptField, hmacField, hashIp
 */
import { describe, it, expect } from 'vitest';
import { encryptField, decryptField, hmacField, hashIp } from '../../src/utils/crypto.js';

describe('crypto utilities', () => {
  describe('encryptField / decryptField', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'hello@example.com';
      const encrypted = encryptField(plaintext);
      const decrypted = decryptField(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt Unicode text', () => {
      const plaintext = 'مرحباً بالعالم 🌍';
      const encrypted = encryptField(plaintext);
      const decrypted = decryptField(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should throw on empty string (no ciphertext data)', () => {
      const encrypted = encryptField('');
      // AES-GCM with empty plaintext produces empty ciphertext, splitting yields no dataHex
      expect(() => decryptField(encrypted)).toThrow('Invalid encrypted field format');
    });

    it('should encrypt and decrypt long string', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encryptField(plaintext);
      const decrypted = decryptField(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce format iv:ciphertext:tag (three hex parts)', () => {
      const encrypted = encryptField('test');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      // IV = 12 bytes = 24 hex chars
      expect(parts[0]).toHaveLength(24);
      // Tag = 16 bytes = 32 hex chars
      expect(parts[2]).toHaveLength(32);
      // All parts should be valid hex
      parts.forEach(p => expect(p).toMatch(/^[0-9a-f]+$/));
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const plaintext = 'same-input';
      const enc1 = encryptField(plaintext);
      const enc2 = encryptField(plaintext);
      expect(enc1).not.toBe(enc2);
    });

    it('should throw on invalid encrypted format', () => {
      expect(() => decryptField('invalid')).toThrow();
      expect(() => decryptField('aa:bb')).toThrow();
      expect(() => decryptField('')).toThrow();
    });

    it('should throw on tampered ciphertext (auth tag mismatch)', () => {
      const encrypted = encryptField('secret');
      const parts = encrypted.split(':');
      // Tamper with the ciphertext
      parts[1] = 'ff'.repeat(parts[1].length / 2);
      expect(() => decryptField(parts.join(':'))).toThrow();
    });

    it('should throw on tampered auth tag', () => {
      const encrypted = encryptField('secret');
      const parts = encrypted.split(':');
      parts[2] = '00'.repeat(16);
      expect(() => decryptField(parts.join(':'))).toThrow();
    });
  });

  describe('hmacField', () => {
    it('should produce a consistent hash for same input', () => {
      const hash1 = hmacField('user@example.com');
      const hash2 = hmacField('user@example.com');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hmacField('alice@example.com');
      const hash2 = hmacField('bob@example.com');
      expect(hash1).not.toBe(hash2);
    });

    it('should be case-insensitive', () => {
      const hash1 = hmacField('User@Example.COM');
      const hash2 = hmacField('user@example.com');
      expect(hash1).toBe(hash2);
    });

    it('should trim whitespace', () => {
      const hash1 = hmacField('  user@example.com  ');
      const hash2 = hmacField('user@example.com');
      expect(hash1).toBe(hash2);
    });

    it('should return valid 64-char hex string (SHA-256)', () => {
      const hash = hmacField('test');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('hashIp', () => {
    it('should produce consistent hashes', () => {
      const h1 = hashIp('192.168.1.1');
      const h2 = hashIp('192.168.1.1');
      expect(h1).toBe(h2);
    });

    it('should produce different hashes for different IPs', () => {
      const h1 = hashIp('192.168.1.1');
      const h2 = hashIp('10.0.0.1');
      expect(h1).not.toBe(h2);
    });

    it('should return valid 64-char hex string', () => {
      const hash = hashIp('::1');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
