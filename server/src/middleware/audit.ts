import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { hashIp } from '../utils/crypto.js';

/** Log security-relevant actions to the audit_log table */
export function auditLog(action: string, req: Request, details: Record<string, unknown> = {}) {
  const ip = req.ip || req.socket.remoteAddress || '';
  db.prepare(
    `INSERT INTO audit_log (action, actor_id, ip_hash, details) VALUES (?, ?, ?, ?)`,
  ).run(action, req.auth?.userId ?? null, hashIp(ip), JSON.stringify(details));
}

/** Express error handler — returns structured JSON errors */
export function errorHandler(err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
  });
}
