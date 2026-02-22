import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { validate } from '../utils/validate.js';
import { requireAuth } from '../middleware/auth.js';

export const cmsRouter = Router();

// ── Public: List published pages ──────────────────────────
cmsRouter.get('/pages', (_req, res) => {
  const rows = db.prepare(
    `SELECT id, slug, title, locale, created_at, updated_at FROM cms_pages WHERE published = 1 ORDER BY created_at DESC`,
  ).all();
  res.json(rows);
});

// ── Public: Get page by slug ──────────────────────────────
cmsRouter.get('/pages/:slug', (req, res) => {
  const row = db.prepare(
    `SELECT * FROM cms_pages WHERE slug = ? AND published = 1`,
  ).get(req.params.slug);
  if (!row) { res.status(404).json({ error: 'Page not found' }); return; }
  res.json(row);
});

// ── Admin: Create page ────────────────────────────────────
const createPageSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(500),
  body: z.string(),
  locale: z.string().max(10).default('en'),
  published: z.boolean().default(false),
});

cmsRouter.post('/pages', requireAuth, (req, res) => {
  const data = validate(createPageSchema, req.body);
  const result = db.prepare(
    `INSERT INTO cms_pages (slug, title, body, locale, published) VALUES (?, ?, ?, ?, ?)`,
  ).run(data.slug, data.title, data.body, data.locale, data.published ? 1 : 0);
  res.status(201).json({ id: result.lastInsertRowid, slug: data.slug });
});

// ── Public: List published blog posts ─────────────────────
cmsRouter.get('/posts', (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100);
  const offset = Math.max(parseInt(String(req.query.offset || '0'), 10), 0);
  const rows = db.prepare(
    `SELECT id, slug, title, excerpt, author, locale, created_at FROM cms_posts WHERE published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  ).all(limit, offset);
  res.json(rows);
});

// ── Public: Get blog post ─────────────────────────────────
cmsRouter.get('/posts/:slug', (req, res) => {
  const row = db.prepare(
    `SELECT * FROM cms_posts WHERE slug = ? AND published = 1`,
  ).get(req.params.slug);
  if (!row) { res.status(404).json({ error: 'Post not found' }); return; }
  res.json(row);
});

// ── Admin: Create blog post ──────────────────────────────
const createPostSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(500),
  excerpt: z.string().max(1000).default(''),
  body: z.string(),
  author: z.string().max(200).default('Shield Messenger'),
  locale: z.string().max(10).default('en'),
  published: z.boolean().default(false),
});

cmsRouter.post('/posts', requireAuth, (req, res) => {
  const data = validate(createPostSchema, req.body);
  const result = db.prepare(
    `INSERT INTO cms_posts (slug, title, excerpt, body, author, locale, published) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(data.slug, data.title, data.excerpt, data.body, data.author, data.locale, data.published ? 1 : 0);
  res.status(201).json({ id: result.lastInsertRowid, slug: data.slug });
});

// ── Public: List downloads ────────────────────────────────
cmsRouter.get('/downloads', (_req, res) => {
  const rows = db.prepare(
    `SELECT * FROM cms_downloads ORDER BY created_at DESC`,
  ).all();
  res.json(rows);
});

// ── Public: Latest download per platform ──────────────────
cmsRouter.get('/downloads/latest', (_req, res) => {
  const rows = db.prepare(`
    SELECT d.* FROM cms_downloads d
    INNER JOIN (
      SELECT platform, MAX(created_at) AS max_date FROM cms_downloads GROUP BY platform
    ) latest ON d.platform = latest.platform AND d.created_at = latest.max_date
  `).all();
  res.json(rows);
});
