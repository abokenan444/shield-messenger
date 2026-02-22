import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../db/connection.js';
import { validate } from '../utils/validate.js';
import { encryptField, hmacField } from '../utils/crypto.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

export const billingRouter = Router();

const SALT_ROUNDS = 12;

// ── Register ──────────────────────────────────────────────
const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

billingRouter.post('/register', async (req, res, next) => {
  try {
    const data = validate(registerSchema, req.body);

    // Check uniqueness
    const existing = db.prepare(`SELECT id FROM users WHERE username = ?`).get(data.username);
    if (existing) { res.status(409).json({ error: 'Username already taken' }); return; }

    const emailHash = hmacField(data.email);
    const existingEmail = db.prepare(`SELECT id FROM users WHERE email_hash = ?`).get(emailHash);
    if (existingEmail) { res.status(409).json({ error: 'Email already registered' }); return; }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const emailEncrypted = encryptField(data.email);

    const result = db.prepare(
      `INSERT INTO users (username, email_encrypted, email_hash, password_hash) VALUES (?, ?, ?, ?)`,
    ).run(data.username, emailEncrypted, emailHash, passwordHash);

    const userId = Number(result.lastInsertRowid);
    const token = signToken({ userId, username: data.username, tier: 'free', role: 'user' });

    auditLog('register', req, { userId });
    res.status(201).json({ token, userId, username: data.username, tier: 'free', role: 'user' });
  } catch (err) { next(err); }
});

// ── Login ─────────────────────────────────────────────────
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

billingRouter.post('/login', async (req, res, next) => {
  try {
    const data = validate(loginSchema, req.body);

    const user = db.prepare(
      `SELECT id, username, password_hash, subscription_tier, role, is_banned FROM users WHERE username = ?`,
    ).get(data.username) as { id: number; username: string; password_hash: string; subscription_tier: string; role: string; is_banned: number } | undefined;

    if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return; }
    if (user.is_banned) { res.status(403).json({ error: 'Account suspended' }); return; }

    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return; }

    db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(user.id);

    const token = signToken({ userId: user.id, username: user.username, tier: user.subscription_tier, role: user.role });
    auditLog('login', req, { userId: user.id });
    res.json({ token, userId: user.id, username: user.username, tier: user.subscription_tier, role: user.role });
  } catch (err) { next(err); }
});

// ── Get current user profile ──────────────────────────────
billingRouter.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(
    `SELECT id, username, role, subscription_tier, subscription_expiry, created_at, last_login_at FROM users WHERE id = ?`,
  ).get(req.auth!.userId);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(user);
});

// ── Subscription plans ────────────────────────────────────
billingRouter.get('/plans', (_req, res) => {
  res.json([
    { id: 'free', name: 'Free', price: 0, features: ['P2P messaging', 'E2EE', 'Tor routing'] },
    { id: 'pro', name: 'Pro', priceMonthly: 499, features: ['Everything in Free', 'Encrypted backup', 'Priority support', 'Custom aliases'] },
    { id: 'enterprise', name: 'Enterprise', priceMonthly: 1999, features: ['Everything in Pro', 'Dedicated infrastructure', 'SLA', 'Admin dashboard'] },
  ]);
});

// ── Upgrade subscription ──────────────────────────────────
const upgradeSchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
  paymentMethod: z.enum(['crypto', 'card', 'bank']).default('crypto'),
  transactionRef: z.string().min(1).max(500),
});

billingRouter.post('/subscribe', requireAuth, (req, res, next) => {
  try {
    const data = validate(upgradeSchema, req.body);

    const priceCents = data.plan === 'pro' ? 499 : 1999;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);

    db.prepare(
      `INSERT INTO payments (user_id, amount_cents, currency, payment_method, transaction_ref, status) VALUES (?, ?, 'USD', ?, ?, 'completed')`,
    ).run(req.auth!.userId, priceCents, data.paymentMethod, data.transactionRef);

    db.prepare(
      `UPDATE users SET subscription_tier = ?, subscription_expiry = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(data.plan, expiry.toISOString(), req.auth!.userId);

    auditLog('subscribe', req, { plan: data.plan, amount: priceCents });
    res.json({ message: 'Subscription activated', tier: data.plan, expiry: expiry.toISOString() });
  } catch (err) { next(err); }
});

// ── Payment history ───────────────────────────────────────
billingRouter.get('/payments', requireAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT id, amount_cents, currency, payment_method, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC`,
  ).all(req.auth!.userId);
  res.json(rows);
});
