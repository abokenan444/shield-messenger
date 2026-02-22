import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthPayload {
  userId: number;
  username: string;
  tier: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/** Require a valid JWT in the Authorization header */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
    req.auth = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Optional auth — populate req.auth if token is present, but don't block */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.auth = jwt.verify(header.slice(7), config.jwt.secret) as AuthPayload;
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

/** Generate a JWT for a user */
export function signToken(payload: AuthPayload): string {
  const opts: jwt.SignOptions = { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwt.secret, opts);
}

/** Require admin role — must be used after requireAuth */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || (req.auth.role !== 'admin' && req.auth.role !== 'superadmin')) {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
}
