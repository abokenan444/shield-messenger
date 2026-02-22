/**
 * Tests for config module
 */
import { describe, it, expect } from 'vitest';
import { config } from '../../src/config.js';

describe('config', () => {
  it('should have a valid port number', () => {
    expect(typeof config.port).toBe('number');
    expect(config.port).toBeGreaterThanOrEqual(0);
    expect(config.port).toBeLessThanOrEqual(65535);
  });

  it('should have node env set to test', () => {
    expect(config.nodeEnv).toBe('test');
  });

  it('should have a jwt secret configured', () => {
    expect(config.jwt.secret).toBeTruthy();
    expect(config.jwt.secret.length).toBeGreaterThan(10);
  });

  it('should have jwt expiresIn configured', () => {
    expect(config.jwt.expiresIn).toBeTruthy();
  });

  it('should have field encryption key configured', () => {
    expect(config.fieldEncryptionKey).toBeTruthy();
    expect(config.fieldEncryptionKey).toHaveLength(64);
    expect(config.fieldEncryptionKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should have rate limiting configured', () => {
    expect(config.rateLimit.windowMs).toBeGreaterThan(0);
    expect(config.rateLimit.max).toBeGreaterThan(0);
  });

  it('should have CORS origin configured', () => {
    expect(config.corsOrigin).toBeTruthy();
    expect(config.corsOrigin).toContain('http');
  });

  it('should have discovery and analytics enabled for tests', () => {
    expect(config.discovery.enabled).toBe(true);
    expect(config.analytics.enabled).toBe(true);
  });
});
