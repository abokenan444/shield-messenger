import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

// ── Per-endpoint progressive rate limiting ─────────────────
// Stricter limits for auth endpoints, lenient for health checks.

/**
 * Auth endpoints: login, register, password-reset.
 * Strict limits to prevent brute-force & credential stuffing.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { error: 'Too many authentication attempts. Try again in 15 minutes.' },
  keyGenerator: (req: Request) => {
    // Use X-Forwarded-For when behind reverse proxy, fall back to IP
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || 'unknown';
  },
});

/**
 * Key exchange / crypto endpoints.
 * Moderate limits — legitimate usage is bursty during session setup.
 */
export const keyExchangeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for key exchange. Try again shortly.' },
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || 'unknown';
  },
});

/**
 * General API endpoints (CMS, support, billing, etc.).
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || 'unknown';
  },
});

/**
 * Admin panel — tight limit, only authenticated admins hit this.
 */
export const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Admin rate limit exceeded.' },
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || 'unknown';
  },
});

/**
 * Upload / file endpoints — heavier payloads need tighter control.
 */
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload rate limit exceeded. Try again later.' },
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || 'unknown';
  },
});

/**
 * Progressive back-off middleware.
 * Tracks repeated violations and extends ban duration exponentially.
 */
const violationCounts = new Map<string, { count: number; lastViolation: number }>();
const VIOLATION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Periodic cleanup of old entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of violationCounts) {
    if (now - entry.lastViolation > 24 * 60 * 60 * 1000) {
      violationCounts.delete(key);
    }
  }
}, VIOLATION_CLEANUP_INTERVAL).unref();

export function progressiveBackoff(req: Request, res: Response, next: NextFunction): void {
  const clientKey = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.ip
    || 'unknown';

  const entry = violationCounts.get(clientKey);

  if (!entry) {
    next();
    return;
  }

  // Exponential back-off: 2^violations minutes, capped at 24 hours
  const backoffMs = Math.min(
    Math.pow(2, entry.count) * 60 * 1000,
    24 * 60 * 60 * 1000,
  );

  const elapsed = Date.now() - entry.lastViolation;

  if (elapsed < backoffMs) {
    const retryAfterSeconds = Math.ceil((backoffMs - elapsed) / 1000);
    res.set('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      error: 'Too many failed attempts. Progressive back-off in effect.',
      retryAfter: retryAfterSeconds,
    });
    return;
  }

  next();
}

/**
 * Call this when a rate-limited action fails (wrong password, invalid token, etc.)
 * to escalate progressive back-off.
 */
export function recordViolation(clientKey: string): void {
  const entry = violationCounts.get(clientKey);
  if (entry) {
    entry.count += 1;
    entry.lastViolation = Date.now();
  } else {
    violationCounts.set(clientKey, { count: 1, lastViolation: Date.now() });
  }
}

/**
 * Clear violations for a client (e.g. after successful login).
 */
export function clearViolations(clientKey: string): void {
  violationCounts.delete(clientKey);
}
