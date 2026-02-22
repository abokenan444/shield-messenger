import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../db/connection.js';
import { validate } from '../utils/validate.js';
import { encryptField, hmacField, decryptField } from '../utils/crypto.js';
import { requireAuth, requireAdmin, signToken } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

export const adminRouter = Router();

// All admin routes require authentication + admin role
adminRouter.use(requireAuth, requireAdmin);

const SALT_ROUNDS = 12;

// ══════════════════════════════════════════════════════════
// Dashboard Overview
// ══════════════════════════════════════════════════════════
adminRouter.get('/dashboard', (req, res) => {
  const userCount = db.prepare(`SELECT COUNT(*) as count FROM users`).get() as { count: number };
  const adminCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role IN ('admin', 'superadmin')`).get() as { count: number };
  const bannedCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE is_banned = 1`).get() as { count: number };
  const ticketCount = db.prepare(`SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('open', 'in_progress')`).get() as { count: number };
  const paymentTotal = db.prepare(`SELECT COALESCE(SUM(amount_cents), 0) as total FROM payments WHERE status = 'completed'`).get() as { total: number };
  const todayRegistrations = db.prepare(`SELECT COUNT(*) as count FROM users WHERE created_at >= date('now')`).get() as { count: number };
  const recentAudit = db.prepare(`SELECT COUNT(*) as count FROM audit_log WHERE created_at >= datetime('now', '-24 hours')`).get() as { count: number };

  const tierBreakdown = db.prepare(`SELECT subscription_tier, COUNT(*) as count FROM users GROUP BY subscription_tier`).all();

  res.json({
    users: { total: userCount.count, admins: adminCount.count, banned: bannedCount.count, todayRegistrations: todayRegistrations.count },
    tickets: { open: ticketCount.count },
    revenue: { totalCents: paymentTotal.total },
    tiers: tierBreakdown,
    auditLast24h: recentAudit.count,
  });
});

// ══════════════════════════════════════════════════════════
// User Management
// ══════════════════════════════════════════════════════════

// List all users
adminRouter.get('/users', (req, res) => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10), 1), 200);
  const offset = (page - 1) * limit;
  const search = String(req.query.search || '').trim();
  const role = String(req.query.role || '').trim();
  const tier = String(req.query.tier || '').trim();

  let where = '1=1';
  const params: unknown[] = [];

  if (search) {
    where += ' AND username LIKE ?';
    params.push(`%${search}%`);
  }
  if (role) {
    where += ' AND role = ?';
    params.push(role);
  }
  if (tier) {
    where += ' AND subscription_tier = ?';
    params.push(tier);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM users WHERE ${where}`).get(...params) as { count: number };
  const users = db.prepare(
    `SELECT id, username, role, subscription_tier, subscription_expiry, is_banned, ban_reason, last_login_at, created_at, updated_at FROM users WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
  ).all(...params, limit, offset);

  res.json({ users, total: total.count, page, limit, pages: Math.ceil(total.count / limit) });
});

// Get single user detail
adminRouter.get('/users/:id', (req, res) => {
  const userId = parseInt(String(req.params.id), 10);
  if (isNaN(userId)) { res.status(400).json({ error: 'Invalid user ID' }); return; }

  const user = db.prepare(
    `SELECT id, username, email_encrypted, role, subscription_tier, subscription_expiry, is_banned, ban_reason, last_login_at, created_at, updated_at FROM users WHERE id = ?`,
  ).get(userId) as { id: number; email_encrypted: string; [key: string]: unknown } | undefined;

  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  // Decrypt email for admin view
  let email = '';
  try { if (user.email_encrypted) email = decryptField(user.email_encrypted as string); } catch { /* */ }

  const payments = db.prepare(
    `SELECT id, amount_cents, currency, payment_method, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
  ).all(userId);

  const tickets = db.prepare(
    `SELECT id, subject, status, priority, created_at FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
  ).all(userId);

  const { email_encrypted: _, ...userData } = user;
  res.json({ ...userData, email, payments, tickets });
});

// Update user role
const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin', 'superadmin']),
});

adminRouter.patch('/users/:id/role', (req, res) => {
  const userId = parseInt(String(req.params.id), 10);
  if (isNaN(userId)) { res.status(400).json({ error: 'Invalid user ID' }); return; }
  if (userId === req.auth!.userId) { res.status(400).json({ error: 'Cannot change your own role' }); return; }

  const data = validate(updateRoleSchema, req.body);
  const result = db.prepare(
    `UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(data.role, userId);

  if (result.changes === 0) { res.status(404).json({ error: 'User not found' }); return; }

  auditLog('admin_change_role', req, { targetUserId: userId, newRole: data.role });
  res.json({ success: true, role: data.role });
});

// Ban user
const banSchema = z.object({
  reason: z.string().max(1000).default('Violation of terms'),
});

adminRouter.patch('/users/:id/ban', (req, res) => {
  const userId = parseInt(String(req.params.id), 10);
  if (isNaN(userId)) { res.status(400).json({ error: 'Invalid user ID' }); return; }
  if (userId === req.auth!.userId) { res.status(400).json({ error: 'Cannot ban yourself' }); return; }

  const data = validate(banSchema, req.body);
  const result = db.prepare(
    `UPDATE users SET is_banned = 1, ban_reason = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(data.reason, userId);

  if (result.changes === 0) { res.status(404).json({ error: 'User not found' }); return; }

  auditLog('admin_ban_user', req, { targetUserId: userId, reason: data.reason });
  res.json({ success: true, banned: true });
});

// Unban user
adminRouter.patch('/users/:id/unban', (req, res) => {
  const userId = parseInt(String(req.params.id), 10);
  if (isNaN(userId)) { res.status(400).json({ error: 'Invalid user ID' }); return; }

  const result = db.prepare(
    `UPDATE users SET is_banned = 0, ban_reason = NULL, updated_at = datetime('now') WHERE id = ?`,
  ).run(userId);

  if (result.changes === 0) { res.status(404).json({ error: 'User not found' }); return; }

  auditLog('admin_unban_user', req, { targetUserId: userId });
  res.json({ success: true, banned: false });
});

// Delete user
adminRouter.delete('/users/:id', (req, res) => {
  const userId = parseInt(String(req.params.id), 10);
  if (isNaN(userId)) { res.status(400).json({ error: 'Invalid user ID' }); return; }
  if (userId === req.auth!.userId) { res.status(400).json({ error: 'Cannot delete yourself' }); return; }

  const result = db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
  if (result.changes === 0) { res.status(404).json({ error: 'User not found' }); return; }

  auditLog('admin_delete_user', req, { targetUserId: userId });
  res.json({ success: true, deleted: true });
});

// Admin create user
const createUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  role: z.enum(['user', 'admin', 'superadmin']).default('user'),
  subscription_tier: z.enum(['free', 'pro', 'enterprise']).default('free'),
});

adminRouter.post('/users', async (req, res, next) => {
  try {
    const data = validate(createUserSchema, req.body);

    const existing = db.prepare(`SELECT id FROM users WHERE username = ?`).get(data.username);
    if (existing) { res.status(409).json({ error: 'Username already taken' }); return; }

    const emailHash = hmacField(data.email);
    const existingEmail = db.prepare(`SELECT id FROM users WHERE email_hash = ?`).get(emailHash);
    if (existingEmail) { res.status(409).json({ error: 'Email already registered' }); return; }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const emailEncrypted = encryptField(data.email);

    const result = db.prepare(
      `INSERT INTO users (username, email_encrypted, email_hash, password_hash, role, subscription_tier) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(data.username, emailEncrypted, emailHash, passwordHash, data.role, data.subscription_tier);

    const userId = Number(result.lastInsertRowid);
    auditLog('admin_create_user', req, { userId, username: data.username, role: data.role });
    res.status(201).json({ userId, username: data.username, role: data.role, tier: data.subscription_tier });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════
// Support Tickets Management
// ══════════════════════════════════════════════════════════

// List all tickets (admin sees all)
adminRouter.get('/tickets', (req, res) => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10), 1), 200);
  const offset = (page - 1) * limit;
  const status = String(req.query.status || '').trim();

  let where = '1=1';
  const params: unknown[] = [];
  if (status) { where += ' AND t.status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as count FROM support_tickets t WHERE ${where}`).get(...params) as { count: number };
  const tickets = db.prepare(
    `SELECT t.id, t.subject, t.status, t.priority, t.created_at, t.updated_at, u.username
     FROM support_tickets t LEFT JOIN users u ON t.user_id = u.id
     WHERE ${where} ORDER BY t.updated_at DESC LIMIT ? OFFSET ?`,
  ).all(...params, limit, offset);

  res.json({ tickets, total: total.count, page, limit });
});

// Get ticket detail
adminRouter.get('/tickets/:id', (req, res) => {
  const ticketId = parseInt(String(req.params.id), 10);
  if (isNaN(ticketId)) { res.status(400).json({ error: 'Invalid ticket ID' }); return; }

  const ticket = db.prepare(
    `SELECT t.*, u.username FROM support_tickets t LEFT JOIN users u ON t.user_id = u.id WHERE t.id = ?`,
  ).get(ticketId);
  if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }

  const messages = db.prepare(
    `SELECT id, sender, body, created_at FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC`,
  ).all(ticketId);

  res.json({ ticket, messages });
});

// Admin reply to ticket
const adminReplySchema = z.object({
  message: z.string().min(1).max(10000),
});

adminRouter.post('/tickets/:id/reply', (req, res) => {
  const ticketId = parseInt(String(req.params.id), 10);
  if (isNaN(ticketId)) { res.status(400).json({ error: 'Invalid ticket ID' }); return; }

  const ticket = db.prepare(`SELECT id FROM support_tickets WHERE id = ?`).get(ticketId);
  if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }

  const data = validate(adminReplySchema, req.body);
  db.prepare(
    `INSERT INTO support_messages (ticket_id, sender, body) VALUES (?, 'staff', ?)`,
  ).run(ticketId, data.message);

  db.prepare(
    `UPDATE support_tickets SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?`,
  ).run(ticketId);

  auditLog('admin_ticket_reply', req, { ticketId });
  res.json({ success: true });
});

// Update ticket status
const ticketStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
});

adminRouter.patch('/tickets/:id/status', (req, res) => {
  const ticketId = parseInt(String(req.params.id), 10);
  if (isNaN(ticketId)) { res.status(400).json({ error: 'Invalid ticket ID' }); return; }

  const data = validate(ticketStatusSchema, req.body);
  const result = db.prepare(
    `UPDATE support_tickets SET status = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(data.status, ticketId);

  if (result.changes === 0) { res.status(404).json({ error: 'Ticket not found' }); return; }

  auditLog('admin_ticket_status', req, { ticketId, status: data.status });
  res.json({ success: true, status: data.status });
});

// ══════════════════════════════════════════════════════════
// CMS Management
// ══════════════════════════════════════════════════════════

// Update page
const updatePageSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  body: z.string().optional(),
  locale: z.string().max(10).optional(),
  published: z.boolean().optional(),
});

adminRouter.patch('/pages/:id', (req, res) => {
  const pageId = parseInt(String(req.params.id), 10);
  if (isNaN(pageId)) { res.status(400).json({ error: 'Invalid page ID' }); return; }

  const data = validate(updatePageSchema, req.body);
  const sets: string[] = [];
  const params: unknown[] = [];

  if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }
  if (data.body !== undefined) { sets.push('body = ?'); params.push(data.body); }
  if (data.locale !== undefined) { sets.push('locale = ?'); params.push(data.locale); }
  if (data.published !== undefined) { sets.push('published = ?'); params.push(data.published ? 1 : 0); }

  if (sets.length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }

  sets.push("updated_at = datetime('now')");
  params.push(pageId);

  const result = db.prepare(`UPDATE cms_pages SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  if (result.changes === 0) { res.status(404).json({ error: 'Page not found' }); return; }

  auditLog('admin_update_page', req, { pageId });
  res.json({ success: true });
});

// Delete page
adminRouter.delete('/pages/:id', (req, res) => {
  const pageId = parseInt(String(req.params.id), 10);
  if (isNaN(pageId)) { res.status(400).json({ error: 'Invalid page ID' }); return; }

  const result = db.prepare(`DELETE FROM cms_pages WHERE id = ?`).run(pageId);
  if (result.changes === 0) { res.status(404).json({ error: 'Page not found' }); return; }

  auditLog('admin_delete_page', req, { pageId });
  res.json({ success: true });
});

// Update post
const updatePostSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  excerpt: z.string().max(1000).optional(),
  body: z.string().optional(),
  author: z.string().max(200).optional(),
  locale: z.string().max(10).optional(),
  published: z.boolean().optional(),
});

adminRouter.patch('/posts/:id', (req, res) => {
  const postId = parseInt(String(req.params.id), 10);
  if (isNaN(postId)) { res.status(400).json({ error: 'Invalid post ID' }); return; }

  const data = validate(updatePostSchema, req.body);
  const sets: string[] = [];
  const params: unknown[] = [];

  if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }
  if (data.excerpt !== undefined) { sets.push('excerpt = ?'); params.push(data.excerpt); }
  if (data.body !== undefined) { sets.push('body = ?'); params.push(data.body); }
  if (data.author !== undefined) { sets.push('author = ?'); params.push(data.author); }
  if (data.locale !== undefined) { sets.push('locale = ?'); params.push(data.locale); }
  if (data.published !== undefined) { sets.push('published = ?'); params.push(data.published ? 1 : 0); }

  if (sets.length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }

  sets.push("updated_at = datetime('now')");
  params.push(postId);

  const result = db.prepare(`UPDATE cms_posts SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  if (result.changes === 0) { res.status(404).json({ error: 'Post not found' }); return; }

  auditLog('admin_update_post', req, { postId });
  res.json({ success: true });
});

// Delete post
adminRouter.delete('/posts/:id', (req, res) => {
  const postId = parseInt(String(req.params.id), 10);
  if (isNaN(postId)) { res.status(400).json({ error: 'Invalid post ID' }); return; }

  const result = db.prepare(`DELETE FROM cms_posts WHERE id = ?`).run(postId);
  if (result.changes === 0) { res.status(404).json({ error: 'Post not found' }); return; }

  auditLog('admin_delete_post', req, { postId });
  res.json({ success: true });
});

// Add download
const createDownloadSchema = z.object({
  platform: z.enum(['android', 'ios', 'web', 'desktop']),
  version: z.string().min(1).max(50),
  url: z.string().url().max(2000),
  checksum: z.string().max(128).default(''),
  releaseNotes: z.string().max(5000).default(''),
});

adminRouter.post('/downloads', (req, res) => {
  const data = validate(createDownloadSchema, req.body);
  const result = db.prepare(
    `INSERT INTO cms_downloads (platform, version, url, checksum, release_notes) VALUES (?, ?, ?, ?, ?)`,
  ).run(data.platform, data.version, data.url, data.checksum, data.releaseNotes);

  auditLog('admin_create_download', req, { platform: data.platform, version: data.version });
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

// Delete download
adminRouter.delete('/downloads/:id', (req, res) => {
  const downloadId = parseInt(String(req.params.id), 10);
  if (isNaN(downloadId)) { res.status(400).json({ error: 'Invalid download ID' }); return; }

  const result = db.prepare(`DELETE FROM cms_downloads WHERE id = ?`).run(downloadId);
  if (result.changes === 0) { res.status(404).json({ error: 'Download not found' }); return; }

  auditLog('admin_delete_download', req, { downloadId });
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════
// Payments Management
// ══════════════════════════════════════════════════════════

adminRouter.get('/payments', (req, res) => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10), 1), 200);
  const offset = (page - 1) * limit;
  const status = String(req.query.status || '').trim();

  let where = '1=1';
  const params: unknown[] = [];
  if (status) { where += ' AND p.status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as count FROM payments p WHERE ${where}`).get(...params) as { count: number };
  const payments = db.prepare(
    `SELECT p.id, p.amount_cents, p.currency, p.payment_method, p.transaction_ref, p.status, p.created_at, u.username
     FROM payments p LEFT JOIN users u ON p.user_id = u.id
     WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
  ).all(...params, limit, offset);

  res.json({ payments, total: total.count, page, limit });
});

// Update payment status
const paymentStatusSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'refunded']),
});

adminRouter.patch('/payments/:id/status', (req, res) => {
  const paymentId = parseInt(String(req.params.id), 10);
  if (isNaN(paymentId)) { res.status(400).json({ error: 'Invalid payment ID' }); return; }

  const data = validate(paymentStatusSchema, req.body);
  const result = db.prepare(`UPDATE payments SET status = ? WHERE id = ?`).run(data.status, paymentId);

  if (result.changes === 0) { res.status(404).json({ error: 'Payment not found' }); return; }

  auditLog('admin_payment_status', req, { paymentId, status: data.status });
  res.json({ success: true, status: data.status });
});

// ══════════════════════════════════════════════════════════
// Audit Log
// ══════════════════════════════════════════════════════════

adminRouter.get('/audit', (req, res) => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '100'), 10), 1), 500);
  const offset = (page - 1) * limit;
  const action = String(req.query.action || '').trim();

  let where = '1=1';
  const params: unknown[] = [];
  if (action) { where += ' AND action = ?'; params.push(action); }

  const total = db.prepare(`SELECT COUNT(*) as count FROM audit_log WHERE ${where}`).get(...params) as { count: number };
  const logs = db.prepare(
    `SELECT a.id, a.action, a.actor_id, a.ip_hash, a.details, a.created_at, u.username
     FROM audit_log a LEFT JOIN users u ON a.actor_id = u.id
     WHERE ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
  ).all(...params, limit, offset);

  res.json({ logs, total: total.count, page, limit });
});

// ══════════════════════════════════════════════════════════
// Analytics (Admin view)
// ══════════════════════════════════════════════════════════

adminRouter.get('/analytics/overview', (_req, res) => {
  const totals = db.prepare(`SELECT metric, SUM(value) as total FROM analytics_daily GROUP BY metric`).all();
  const last7days = db.prepare(
    `SELECT date, metric, platform, value FROM analytics_daily WHERE date >= date('now', '-7 days') ORDER BY date ASC`,
  ).all();
  const versions = db.prepare(
    `SELECT version, platform, install_count, updated_at FROM analytics_versions ORDER BY updated_at DESC`,
  ).all();

  res.json({ totals, last7days, versions });
});

// ══════════════════════════════════════════════════════════
// Discovery Management
// ══════════════════════════════════════════════════════════

adminRouter.get('/discovery', (req, res) => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10), 1), 200);
  const offset = (page - 1) * limit;

  const total = db.prepare(`SELECT COUNT(*) as count FROM discovery_entries`).get() as { count: number };
  const entries = db.prepare(
    `SELECT alias, public_key_fingerprint, created_at, updated_at FROM discovery_entries ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  ).all(limit, offset);

  res.json({ entries, total: total.count, page, limit });
});

adminRouter.delete('/discovery/:alias', (req, res) => {
  const alias = req.params.alias.startsWith('@') ? req.params.alias : `@${req.params.alias}`;
  const result = db.prepare(`DELETE FROM discovery_entries WHERE alias = ?`).run(alias);

  if (result.changes === 0) { res.status(404).json({ error: 'Alias not found' }); return; }

  auditLog('admin_delete_discovery', req, { alias });
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════
// Notifications Management
// ══════════════════════════════════════════════════════════

const createNotificationSchema = z.object({
  userId: z.number().int().positive().optional(),
  type: z.enum(['info', 'warning', 'alert', 'system']).default('info'),
  title: z.string().min(1).max(500),
  body: z.string().max(5000).default(''),
});

adminRouter.post('/notifications', (req, res) => {
  const data = validate(createNotificationSchema, req.body);
  const result = db.prepare(
    `INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)`,
  ).run(data.userId ?? null, data.type, data.title, data.body);

  auditLog('admin_create_notification', req, { notificationId: Number(result.lastInsertRowid) });
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

// Broadcast notification to all users
const broadcastSchema = z.object({
  type: z.enum(['info', 'warning', 'alert', 'system']).default('system'),
  title: z.string().min(1).max(500),
  body: z.string().max(5000).default(''),
});

adminRouter.post('/notifications/broadcast', (req, res) => {
  const data = validate(broadcastSchema, req.body);
  const users = db.prepare(`SELECT id FROM users`).all() as { id: number }[];

  const insert = db.prepare(
    `INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)`,
  );
  const tx = db.transaction(() => {
    for (const u of users) {
      insert.run(u.id, data.type, data.title, data.body);
    }
  });
  tx();

  auditLog('admin_broadcast', req, { userCount: users.length });
  res.json({ success: true, userCount: users.length });
});

// ══════════════════════════════════════════════════════════
// System Settings
// ══════════════════════════════════════════════════════════

adminRouter.get('/settings', (_req, res) => {
  const settings = db.prepare(`SELECT key, value, updated_at FROM system_settings ORDER BY key`).all();
  res.json(settings);
});

const updateSettingSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_.]+$/),
  value: z.string().max(10000),
});

adminRouter.put('/settings', (req, res) => {
  const data = validate(updateSettingSchema, req.body);
  db.prepare(
    `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(data.key, data.value);

  auditLog('admin_update_setting', req, { key: data.key });
  res.json({ success: true });
});
