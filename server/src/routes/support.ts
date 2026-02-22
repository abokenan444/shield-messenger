import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { validate } from '../utils/validate.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

export const supportRouter = Router();

// ── Create ticket ─────────────────────────────────────────
const createTicketSchema = z.object({
  subject: z.string().min(1).max(500),
  message: z.string().min(1).max(10000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

supportRouter.post('/tickets', optionalAuth, (req, res, next) => {
  try {
    const data = validate(createTicketSchema, req.body);

    const result = db.prepare(
      `INSERT INTO support_tickets (user_id, subject, priority) VALUES (?, ?, ?)`,
    ).run(req.auth?.userId ?? null, data.subject, data.priority);

    const ticketId = Number(result.lastInsertRowid);

    db.prepare(
      `INSERT INTO support_messages (ticket_id, sender, body) VALUES (?, 'user', ?)`,
    ).run(ticketId, data.message);

    auditLog('ticket_create', req, { ticketId });
    res.status(201).json({ ticketId, status: 'open' });
  } catch (err) { next(err); }
});

// ── List my tickets ───────────────────────────────────────
supportRouter.get('/tickets', requireAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT id, subject, status, priority, created_at, updated_at FROM support_tickets WHERE user_id = ? ORDER BY updated_at DESC`,
  ).all(req.auth!.userId);
  res.json(rows);
});

// ── Get ticket detail with messages ───────────────────────
supportRouter.get('/tickets/:id', requireAuth, (req, res) => {
  const ticketId = parseInt(String(req.params.id), 10);
  if (isNaN(ticketId)) { res.status(400).json({ error: 'Invalid ticket ID' }); return; }

  const ticket = db.prepare(
    `SELECT * FROM support_tickets WHERE id = ? AND user_id = ?`,
  ).get(ticketId, req.auth!.userId);
  if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }

  const messages = db.prepare(
    `SELECT id, sender, body, created_at FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC`,
  ).all(ticketId);

  res.json({ ticket, messages });
});

// ── Reply to ticket ───────────────────────────────────────
const replySchema = z.object({
  message: z.string().min(1).max(10000),
});

supportRouter.post('/tickets/:id/reply', requireAuth, (req, res, next) => {
  try {
    const ticketId = parseInt(String(req.params.id), 10);
    if (isNaN(ticketId)) { res.status(400).json({ error: 'Invalid ticket ID' }); return; }

    const ticket = db.prepare(
      `SELECT id FROM support_tickets WHERE id = ? AND user_id = ?`,
    ).get(ticketId, req.auth!.userId);
    if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }

    const data = validate(replySchema, req.body);
    db.prepare(
      `INSERT INTO support_messages (ticket_id, sender, body) VALUES (?, 'user', ?)`,
    ).run(ticketId, data.message);

    db.prepare(
      `UPDATE support_tickets SET updated_at = datetime('now') WHERE id = ?`,
    ).run(ticketId);

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Close ticket ──────────────────────────────────────────
supportRouter.patch('/tickets/:id/close', requireAuth, (req, res) => {
  const ticketId = parseInt(String(req.params.id), 10);
  if (isNaN(ticketId)) { res.status(400).json({ error: 'Invalid ticket ID' }); return; }

  const result = db.prepare(
    `UPDATE support_tickets SET status = 'closed', updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
  ).run(ticketId, req.auth!.userId);

  if (result.changes === 0) { res.status(404).json({ error: 'Ticket not found' }); return; }
  res.json({ success: true, status: 'closed' });
});
