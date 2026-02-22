import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { validate } from '../utils/validate.js';

export const analyticsRouter = Router();

// ── Record anonymous metric (called by clients without auth) ─
const recordSchema = z.object({
  metric: z.enum(['downloads', 'active_users', 'new_users', 'messages_sent']),
  platform: z.enum(['android', 'ios', 'web', 'desktop', 'all']).default('all'),
  value: z.number().int().min(1).default(1),
});

analyticsRouter.post('/record', (req, res, next) => {
  try {
    const data = validate(recordSchema, req.body);
    const today = new Date().toISOString().slice(0, 10);

    db.prepare(`
      INSERT INTO analytics_daily (date, metric, platform, value)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date, metric, platform) DO UPDATE SET value = value + excluded.value
    `).run(today, data.metric, data.platform, data.value);

    res.json({ recorded: true });
  } catch (err) { next(err); }
});

// ── Record version install ────────────────────────────────
const versionSchema = z.object({
  version: z.string().min(1).max(50),
  platform: z.enum(['android', 'ios', 'web', 'desktop']),
});

analyticsRouter.post('/version', (req, res, next) => {
  try {
    const data = validate(versionSchema, req.body);

    db.prepare(`
      INSERT INTO analytics_versions (version, platform, install_count, updated_at)
      VALUES (?, ?, 1, datetime('now'))
      ON CONFLICT(version, platform) DO UPDATE SET install_count = install_count + 1, updated_at = datetime('now')
    `).run(data.version, data.platform);

    res.json({ recorded: true });
  } catch (err) { next(err); }
});

// ── Public: Get aggregated stats ──────────────────────────
analyticsRouter.get('/stats', (_req, res) => {
  const totals = db.prepare(`
    SELECT metric, SUM(value) as total FROM analytics_daily GROUP BY metric
  `).all();

  const todayStr = new Date().toISOString().slice(0, 10);
  const today = db.prepare(`
    SELECT metric, platform, value FROM analytics_daily WHERE date = ?
  `).all(todayStr);

  const versions = db.prepare(`
    SELECT version, platform, install_count FROM analytics_versions ORDER BY updated_at DESC LIMIT 20
  `).all();

  res.json({ totals, today, versions });
});

// ── Public: Get daily trend for a metric ──────────────────
analyticsRouter.get('/trend/:metric', (req, res) => {
  const metric = req.params.metric;
  const days = Math.min(parseInt(String(req.query.days || '30'), 10), 365);

  const rows = db.prepare(`
    SELECT date, platform, value FROM analytics_daily
    WHERE metric = ? AND date >= date('now', ?)
    ORDER BY date ASC
  `).all(metric, `-${days} days`);

  res.json(rows);
});
