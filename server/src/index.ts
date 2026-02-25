import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config } from './config.js';
import { logger } from './logger.js';
import { migrate } from './db/migrate.js';
import { errorHandler } from './middleware/audit.js';
import {
  authLimiter,
  apiLimiter,
  adminLimiter,
  progressiveBackoff,
} from './middleware/rateLimit.js';

import { cmsRouter } from './routes/cms.js';
import { billingRouter } from './routes/billing.js';
import { supportRouter } from './routes/support.js';
import { discoveryRouter } from './routes/discovery.js';
import { analyticsRouter } from './routes/analytics.js';
import { adminRouter } from './routes/admin.js';

// ── Run migrations on startup ─────────────────────────────
migrate();

// ── Create Express app ────────────────────────────────────
const app = express();

// ── Security headers ──────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(compression());

// ── Global rate limiter ───────────────────────────────────
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
}));

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'shield-messenger-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes (mounted under /api) ──────────────────────
//
//  Architecture:
//  [App/Client]  <--->  [API Gateway (/api)]  <--->  [Service Routes]
//                       (HTTPS + Rate Limiting)           |
//                                                         +---> /api/cms/*       (CMS DB)
//                                                         +---> /api/billing/*   (Billing DB)
//                                                         +---> /api/support/*   (Support DB)
//                                                         +---> /api/discovery/* (Discovery DB)
//                                                         +---> /api/analytics/* (Analytics DB)
//

// ── Progressive back-off (before route limiters) ─────────
app.use(progressiveBackoff);

// ── Per-route rate limiters ───────────────────────────────
app.use('/api/cms', apiLimiter, cmsRouter);
app.use('/api/billing', apiLimiter, billingRouter);
app.use('/api/support', apiLimiter, supportRouter);
app.use('/api/admin', adminLimiter, adminRouter);

if (config.discovery.enabled) {
  app.use('/api/discovery', discoveryRouter);
  logger.info('Discovery service enabled');
}

if (config.analytics.enabled) {
  app.use('/api/analytics', analyticsRouter);
  logger.info('Analytics service enabled');
}

// ── 404 handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────
app.listen(config.port, () => {
  logger.info(`Shield Messenger API Gateway running on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`CORS origin: ${config.corsOrigin}`);
  logger.info('');
  logger.info('Available services:');
  logger.info('  GET  /api/health            — Health check');
  logger.info('  ---  /api/cms/*             — Content Management');
  logger.info('  ---  /api/billing/*          — Subscriptions & Payments');
  logger.info('  ---  /api/support/*          — Support Tickets');
  logger.info('  ---  /api/admin/*            — Admin Panel');
  if (config.discovery.enabled)
    logger.info('  ---  /api/discovery/*        — Identity Discovery');
  if (config.analytics.enabled)
    logger.info('  ---  /api/analytics/*        — Anonymous Analytics');
});
