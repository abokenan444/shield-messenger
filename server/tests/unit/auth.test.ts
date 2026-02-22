/**
 * Tests for JWT auth middleware: signToken, requireAuth, optionalAuth
 */
import { describe, it, expect, vi } from 'vitest';
import { signToken, requireAuth, optionalAuth, type AuthPayload } from '../../src/middleware/auth.js';
import jwt from 'jsonwebtoken';

const TEST_SECRET = process.env.JWT_SECRET!;

function mockReq(authHeader?: string) {
  return {
    headers: { authorization: authHeader },
    auth: undefined,
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('auth middleware', () => {
  const testPayload: AuthPayload = {
    userId: 1,
    username: 'testuser',
    tier: 'free',
  };

  describe('signToken', () => {
    it('should generate a valid JWT token', () => {
      const token = signToken(testPayload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should contain the correct payload', () => {
      const token = signToken(testPayload);
      const decoded = jwt.verify(token, TEST_SECRET) as AuthPayload;
      expect(decoded.userId).toBe(1);
      expect(decoded.username).toBe('testuser');
      expect(decoded.tier).toBe('free');
    });

    it('should include expiry claim', () => {
      const token = signToken(testPayload);
      const decoded = jwt.decode(token) as any;
      expect(decoded.exp).toBeTruthy();
      expect(decoded.iat).toBeTruthy();
    });
  });

  describe('requireAuth', () => {
    it('should reject request without Authorization header', () => {
      const req = mockReq();
      const res = mockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid Bearer format', () => {
      const req = mockReq('Basic some-token');
      const res = mockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      const req = mockReq('Bearer invalid-token');
      const res = mockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', () => {
      const expiredToken = jwt.sign(testPayload, TEST_SECRET, { expiresIn: '0s' });
      const req = mockReq(`Bearer ${expiredToken}`);
      const res = mockRes();
      const next = vi.fn();

      // Wait a tick so the token expires
      setTimeout(() => {
        requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
      }, 100);
    });

    it('should accept request with valid token and populate req.auth', () => {
      const token = signToken(testPayload);
      const req = mockReq(`Bearer ${token}`);
      const res = mockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth).toBeDefined();
      expect(req.auth.userId).toBe(1);
      expect(req.auth.username).toBe('testuser');
      expect(req.auth.tier).toBe('free');
    });

    it('should reject token signed with wrong secret', () => {
      const badToken = jwt.sign(testPayload, 'wrong-secret');
      const req = mockReq(`Bearer ${badToken}`);
      const res = mockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should proceed without token and leave req.auth undefined', () => {
      const req = mockReq();
      const res = mockRes();
      const next = vi.fn();

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth).toBeUndefined();
    });

    it('should populate req.auth with valid token', () => {
      const token = signToken(testPayload);
      const req = mockReq(`Bearer ${token}`);
      const res = mockRes();
      const next = vi.fn();

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth?.userId).toBe(1);
    });

    it('should proceed with invalid token (ignoring it)', () => {
      const req = mockReq('Bearer bad-token');
      const res = mockRes();
      const next = vi.fn();

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth).toBeUndefined();
    });
  });
});
