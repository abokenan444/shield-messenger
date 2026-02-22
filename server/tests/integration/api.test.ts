/**
 * Integration tests for all API routes.
 * Uses the real Express app with an in-memory SQLite database.
 *
 * We import the real modules but the setup.ts already sets SQLITE_PATH=:memory:
 * so the database is fresh for each test run.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { db } from '../../src/db/connection.js';
import { migrate } from '../../src/db/migrate.js';
import { errorHandler } from '../../src/middleware/audit.js';
import { cmsRouter } from '../../src/routes/cms.js';
import { billingRouter } from '../../src/routes/billing.js';
import { supportRouter } from '../../src/routes/support.js';
import { discoveryRouter } from '../../src/routes/discovery.js';
import { analyticsRouter } from '../../src/routes/analytics.js';

let app: express.Express;
let authToken: string;

beforeAll(() => {
  migrate();

  app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'shield-messenger-api', version: '0.1.0' });
  });

  app.use('/api/cms', cmsRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/support', supportRouter);
  app.use('/api/discovery', discoveryRouter);
  app.use('/api/analytics', analyticsRouter);

  app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });
  app.use(errorHandler);
});

// ══════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════
describe('GET /api/health', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('shield-messenger-api');
  });
});

// ══════════════════════════════════════════════════════
// 404
// ══════════════════════════════════════════════════════
describe('404 handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});

// ══════════════════════════════════════════════════════
// BILLING: Registration & Login
// ══════════════════════════════════════════════════════
describe('Billing API', () => {
  describe('POST /api/billing/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/billing/register')
        .send({ username: 'testuser', email: 'test@example.com', password: 'secure12345' });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeTruthy();
      expect(res.body.username).toBe('testuser');
      expect(res.body.tier).toBe('free');
      authToken = res.body.token;
    });

    it('should reject duplicate username', async () => {
      const res = await request(app)
        .post('/api/billing/register')
        .send({ username: 'testuser', email: 'other@example.com', password: 'secure12345' });
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Username');
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/billing/register')
        .send({ username: 'anotheruser', email: 'test@example.com', password: 'secure12345' });
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Email');
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/billing/register')
        .send({ username: 'user2', email: 'user2@test.com', password: 'short' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/billing/register')
        .send({ username: 'user3', email: 'not-an-email', password: 'password123' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid username characters', async () => {
      const res = await request(app)
        .post('/api/billing/register')
        .send({ username: 'has spaces!', email: 'x@x.com', password: 'password123' });
      expect(res.status).toBe(400);
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/billing/register')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/billing/login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/billing/login')
        .send({ username: 'testuser', password: 'secure12345' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.username).toBe('testuser');
      authToken = res.body.token;
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/billing/login')
        .send({ username: 'testuser', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/billing/login')
        .send({ username: 'nonexistent', password: 'password123' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject empty fields', async () => {
      const res = await request(app)
        .post('/api/billing/login')
        .send({ username: '', password: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/billing/me', () => {
    it('should return user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/billing/me')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('testuser');
      expect(res.body.subscription_tier).toBe('free');
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/billing/me');
      expect(res.status).toBe(401);
    });

    it('should reject with invalid token', async () => {
      const res = await request(app)
        .get('/api/billing/me')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/billing/plans', () => {
    it('should return subscription plans', async () => {
      const res = await request(app).get('/api/billing/plans');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body.map((p: any) => p.id)).toEqual(['free', 'pro', 'enterprise']);
    });
  });

  describe('POST /api/billing/subscribe', () => {
    it('should upgrade subscription with valid token', async () => {
      const res = await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ plan: 'pro', paymentMethod: 'crypto', transactionRef: 'tx-abc-123' });
      expect(res.status).toBe(200);
      expect(res.body.tier).toBe('pro');
      expect(res.body.expiry).toBeTruthy();
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .post('/api/billing/subscribe')
        .send({ plan: 'pro', transactionRef: 'tx-123' });
      expect(res.status).toBe(401);
    });

    it('should reject invalid plan', async () => {
      const res = await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ plan: 'invalid', transactionRef: 'tx-123' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/billing/payments', () => {
    it('should return payment history', async () => {
      const res = await request(app)
        .get('/api/billing/payments')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ══════════════════════════════════════════════════════
// CMS
// ══════════════════════════════════════════════════════
describe('CMS API', () => {
  describe('POST /api/cms/pages', () => {
    it('should create a page (authed)', async () => {
      const res = await request(app)
        .post('/api/cms/pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ slug: 'test-page', title: 'Test Page', body: 'Hello world', published: true });
      expect(res.status).toBe(201);
      expect(res.body.slug).toBe('test-page');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/api/cms/pages')
        .send({ slug: 'x', title: 'X', body: '' });
      expect(res.status).toBe(401);
    });

    it('should reject invalid slug', async () => {
      const res = await request(app)
        .post('/api/cms/pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ slug: 'Invalid Slug!', title: 'X', body: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/cms/pages', () => {
    it('should list published pages', async () => {
      const res = await request(app).get('/api/cms/pages');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/cms/pages/:slug', () => {
    it('should return a page by slug', async () => {
      const res = await request(app).get('/api/cms/pages/test-page');
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Test Page');
    });

    it('should return 404 for non-existent page', async () => {
      const res = await request(app).get('/api/cms/pages/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/cms/posts', () => {
    it('should create a blog post', async () => {
      const res = await request(app)
        .post('/api/cms/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ slug: 'first-post', title: 'First Post', body: 'Content', excerpt: 'Summary', published: true });
      expect(res.status).toBe(201);
      expect(res.body.slug).toBe('first-post');
    });
  });

  describe('GET /api/cms/posts', () => {
    it('should list published blog posts with pagination', async () => {
      const res = await request(app).get('/api/cms/posts?limit=10&offset=0');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/cms/posts/:slug', () => {
    it('should return a post by slug', async () => {
      const res = await request(app).get('/api/cms/posts/first-post');
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('First Post');
    });

    it('should return 404 for non-existent post', async () => {
      const res = await request(app).get('/api/cms/posts/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/cms/downloads', () => {
    it('should return empty downloads list initially', async () => {
      const res = await request(app).get('/api/cms/downloads');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/cms/downloads/latest', () => {
    it('should return latest downloads per platform', async () => {
      const res = await request(app).get('/api/cms/downloads/latest');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════
// SUPPORT
// ══════════════════════════════════════════════════════
describe('Support API', () => {
  let ticketId: number;

  describe('POST /api/support/tickets', () => {
    it('should create a ticket (with auth)', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ subject: 'Need help', message: 'I have a problem', priority: 'high' });
      expect(res.status).toBe(201);
      expect(res.body.ticketId).toBeTruthy();
      expect(res.body.status).toBe('open');
      ticketId = res.body.ticketId;
    });

    it('should create a ticket (anonymously)', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .send({ subject: 'Anonymous Issue', message: 'Help me' });
      expect(res.status).toBe(201);
    });

    it('should reject empty subject', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .send({ subject: '', message: 'x' });
      expect(res.status).toBe(400);
    });

    it('should reject empty message', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .send({ subject: 'Test', message: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/support/tickets', () => {
    it('should list user tickets', async () => {
      const res = await request(app)
        .get('/api/support/tickets')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/api/support/tickets');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/support/tickets/:id', () => {
    it('should return ticket with messages', async () => {
      const res = await request(app)
        .get(`/api/support/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ticket).toBeTruthy();
      expect(res.body.messages).toBeTruthy();
      expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 404 for non-existent ticket', async () => {
      const res = await request(app)
        .get('/api/support/tickets/9999')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
    });

    it('should reject invalid ticket ID', async () => {
      const res = await request(app)
        .get('/api/support/tickets/abc')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/support/tickets/:id/reply', () => {
    it('should add a reply to ticket', async () => {
      const res = await request(app)
        .post(`/api/support/tickets/${ticketId}/reply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'Here is more info' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject empty reply', async () => {
      const res = await request(app)
        .post(`/api/support/tickets/${ticketId}/reply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/support/tickets/:id/close', () => {
    it('should close a ticket', async () => {
      const res = await request(app)
        .patch(`/api/support/tickets/${ticketId}/close`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('closed');
    });

    it('should return 404 for non-existent ticket', async () => {
      const res = await request(app)
        .patch('/api/support/tickets/9999/close')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
    });
  });
});

// ══════════════════════════════════════════════════════
// DISCOVERY
// ══════════════════════════════════════════════════════
describe('Discovery API', () => {
  const fingerprint = 'abc123def456abcdef' + '0'.repeat(30);

  describe('POST /api/discovery/register', () => {
    it('should register an alias', async () => {
      const res = await request(app)
        .post('/api/discovery/register')
        .send({ alias: '@alice', publicKeyFingerprint: fingerprint, onionEncrypted: 'enc-data' });
      expect(res.status).toBe(200);
      expect(res.body.alias).toBe('@alice');
      expect(res.body.registered).toBe(true);
    });

    it('should update existing alias with same fingerprint', async () => {
      const res = await request(app)
        .post('/api/discovery/register')
        .send({ alias: '@alice', publicKeyFingerprint: fingerprint, onionEncrypted: 'new-enc-data' });
      expect(res.status).toBe(200);
    });

    it('should reject alias with different fingerprint', async () => {
      const res = await request(app)
        .post('/api/discovery/register')
        .send({ alias: '@alice', publicKeyFingerprint: 'different-fingerprint!!!!', onionEncrypted: '' });
      expect(res.status).toBe(409);
    });

    it('should reject alias without @ prefix', async () => {
      const res = await request(app)
        .post('/api/discovery/register')
        .send({ alias: 'no-at', publicKeyFingerprint: fingerprint });
      expect(res.status).toBe(400);
    });

    it('should reject alias with spaces', async () => {
      const res = await request(app)
        .post('/api/discovery/register')
        .send({ alias: '@has space', publicKeyFingerprint: fingerprint });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/discovery/lookup/:alias', () => {
    it('should find registered alias', async () => {
      const res = await request(app).get('/api/discovery/lookup/@alice');
      expect(res.status).toBe(200);
      expect(res.body.alias).toBe('@alice');
      expect(res.body.public_key_fingerprint).toBe(fingerprint);
    });

    it('should auto-prepend @ if missing', async () => {
      const res = await request(app).get('/api/discovery/lookup/alice');
      expect(res.status).toBe(200);
      expect(res.body.alias).toBe('@alice');
    });

    it('should return 404 for unknown alias', async () => {
      const res = await request(app).get('/api/discovery/lookup/@nobody');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/discovery/search', () => {
    it('should search by prefix', async () => {
      const res = await request(app).get('/api/discovery/search?q=@ali');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject short queries', async () => {
      const res = await request(app).get('/api/discovery/search?q=a');
      expect(res.status).toBe(400);
    });

    it('should return empty for no match', async () => {
      const res = await request(app).get('/api/discovery/search?q=@zzzzzzz');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('DELETE /api/discovery/remove', () => {
    it('should remove alias with correct fingerprint', async () => {
      // First register
      await request(app)
        .post('/api/discovery/register')
        .send({ alias: '@toremove', publicKeyFingerprint: fingerprint });

      const res = await request(app)
        .delete('/api/discovery/remove')
        .send({ alias: '@toremove', publicKeyFingerprint: fingerprint });
      expect(res.status).toBe(200);
      expect(res.body.removed).toBe(true);
    });

    it('should reject removal with wrong fingerprint', async () => {
      await request(app)
        .post('/api/discovery/register')
        .send({ alias: '@keepme', publicKeyFingerprint: fingerprint });

      const res = await request(app)
        .delete('/api/discovery/remove')
        .send({ alias: '@keepme', publicKeyFingerprint: 'wrong-fingerprint!!!!!!' });
      expect(res.status).toBe(404);
    });
  });
});

// ══════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════
describe('Analytics API', () => {
  describe('POST /api/analytics/record', () => {
    it('should record a metric', async () => {
      const res = await request(app)
        .post('/api/analytics/record')
        .send({ metric: 'downloads', platform: 'android', value: 1 });
      expect(res.status).toBe(200);
      expect(res.body.recorded).toBe(true);
    });

    it('should reject invalid metric', async () => {
      const res = await request(app)
        .post('/api/analytics/record')
        .send({ metric: 'invalid_metric', platform: 'web' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid platform', async () => {
      const res = await request(app)
        .post('/api/analytics/record')
        .send({ metric: 'downloads', platform: 'invalid' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/analytics/version', () => {
    it('should record a version install', async () => {
      const res = await request(app)
        .post('/api/analytics/version')
        .send({ version: '1.0.0', platform: 'android' });
      expect(res.status).toBe(200);
      expect(res.body.recorded).toBe(true);
    });

    it('should increment on duplicate', async () => {
      await request(app)
        .post('/api/analytics/version')
        .send({ version: '1.0.0', platform: 'android' });
      const res = await request(app)
        .post('/api/analytics/version')
        .send({ version: '1.0.0', platform: 'android' });
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/analytics/stats', () => {
    it('should return aggregated stats', async () => {
      const res = await request(app).get('/api/analytics/stats');
      expect(res.status).toBe(200);
      expect(res.body.totals).toBeDefined();
      expect(res.body.today).toBeDefined();
      expect(res.body.versions).toBeDefined();
    });
  });

  describe('GET /api/analytics/trend/:metric', () => {
    it('should return trend data', async () => {
      const res = await request(app).get('/api/analytics/trend/downloads?days=30');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════
// AUDIT LOG VERIFICATION
// ══════════════════════════════════════════════════════
describe('Audit Log', () => {
  it('should have recorded login, register, and other actions', () => {
    const entries = db.prepare(`SELECT action FROM audit_log ORDER BY id`).all() as { action: string }[];
    const actions = entries.map(e => e.action);
    expect(actions).toContain('register');
    expect(actions).toContain('login');
    expect(actions).toContain('ticket_create');
    expect(actions).toContain('discovery_register');
  });

  it('should have hashed IPs (not raw)', () => {
    const entries = db.prepare(`SELECT ip_hash FROM audit_log WHERE ip_hash != ''`).all() as { ip_hash: string }[];
    for (const entry of entries) {
      // Should be a hex HMAC-SHA256 hash, not a raw IP
      expect(entry.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
