import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { validate } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';

export const discoveryRouter = Router();

// ── Register / update alias ───────────────────────────────
const registerSchema = z.object({
  alias: z.string().min(2).max(50).regex(/^@[a-zA-Z0-9_-]+$/, 'Alias must start with @ and contain only alphanumeric, - or _'),
  publicKeyFingerprint: z.string().min(16).max(128),
  onionEncrypted: z.string().max(5000).default(''),
});

discoveryRouter.post('/register', (req, res, next) => {
  try {
    const data = validate(registerSchema, req.body);

    // Upsert: insert or update if alias already exists with same fingerprint
    const existing = db.prepare(
      `SELECT alias, public_key_fingerprint FROM discovery_entries WHERE alias = ?`,
    ).get(data.alias) as { alias: string; public_key_fingerprint: string } | undefined;

    if (existing && existing.public_key_fingerprint !== data.publicKeyFingerprint) {
      res.status(409).json({ error: 'Alias already registered to a different key' });
      return;
    }

    if (existing) {
      db.prepare(
        `UPDATE discovery_entries SET onion_encrypted = ?, updated_at = datetime('now') WHERE alias = ?`,
      ).run(data.onionEncrypted, data.alias);
    } else {
      db.prepare(
        `INSERT INTO discovery_entries (alias, public_key_fingerprint, onion_encrypted) VALUES (?, ?, ?)`,
      ).run(data.alias, data.publicKeyFingerprint, data.onionEncrypted);
    }

    auditLog('discovery_register', req, { alias: data.alias });
    res.json({ alias: data.alias, registered: true });
  } catch (err) { next(err); }
});

// ── Look up by alias ──────────────────────────────────────
discoveryRouter.get('/lookup/:alias', (req, res) => {
  const alias = req.params.alias.startsWith('@') ? req.params.alias : `@${req.params.alias}`;

  const entry = db.prepare(
    `SELECT alias, public_key_fingerprint, onion_encrypted FROM discovery_entries WHERE alias = ?`,
  ).get(alias);

  if (!entry) { res.status(404).json({ error: 'Alias not found' }); return; }
  res.json(entry);
});

// ── Search aliases (prefix match, limited) ────────────────
discoveryRouter.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) { res.status(400).json({ error: 'Query must be at least 2 characters' }); return; }

  const prefix = q.startsWith('@') ? q : `@${q}`;
  const rows = db.prepare(
    `SELECT alias, public_key_fingerprint FROM discovery_entries WHERE alias LIKE ? LIMIT 20`,
  ).all(`${prefix}%`);

  res.json(rows);
});

// ── Delete own alias (proof by providing matching fingerprint) ─
const deleteSchema = z.object({
  alias: z.string().min(2).max(50),
  publicKeyFingerprint: z.string().min(16).max(128),
});

discoveryRouter.delete('/remove', (req, res, next) => {
  try {
    const data = validate(deleteSchema, req.body);
    const alias = data.alias.startsWith('@') ? data.alias : `@${data.alias}`;

    const result = db.prepare(
      `DELETE FROM discovery_entries WHERE alias = ? AND public_key_fingerprint = ?`,
    ).run(alias, data.publicKeyFingerprint);

    if (result.changes === 0) { res.status(404).json({ error: 'Alias not found or fingerprint mismatch' }); return; }

    auditLog('discovery_remove', req, { alias });
    res.json({ removed: true });
  } catch (err) { next(err); }
});
