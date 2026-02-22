/**
 * Creates a fresh Express app + in-memory SQLite database for each test suite.
 * This avoids importing the main index.ts which auto-starts the server.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { errorHandler } from '../src/middleware/audit.js';

// We store the test db in a module-level variable so routes can access it
let testDb: DatabaseType;

/**
 * Build the migration SQL (same as migrate.ts, but on a provided db instance)
 */
function runMigrations(db: DatabaseType) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cms_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '', locale TEXT NOT NULL DEFAULT 'en',
      published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS cms_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT 'Shield Messenger', locale TEXT NOT NULL DEFAULT 'en',
      published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS cms_downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, platform TEXT NOT NULL, version TEXT NOT NULL,
      url TEXT NOT NULL, checksum TEXT NOT NULL DEFAULT '', release_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE,
      email_encrypted TEXT NOT NULL DEFAULT '', email_hash TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL, subscription_tier TEXT NOT NULL DEFAULT 'free',
      subscription_expiry TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
      payment_method TEXT NOT NULL DEFAULT 'crypto', transaction_ref TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      subject TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'normal', created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS support_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender TEXT NOT NULL DEFAULT 'user', body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS discovery_entries (
      alias TEXT PRIMARY KEY, public_key_fingerprint TEXT NOT NULL,
      onion_encrypted TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS analytics_daily (
      date TEXT NOT NULL, metric TEXT NOT NULL, platform TEXT NOT NULL DEFAULT 'all',
      value INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (date, metric, platform)
    );
    CREATE TABLE IF NOT EXISTS analytics_versions (
      version TEXT NOT NULL, platform TEXT NOT NULL, install_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (version, platform)
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, actor_id INTEGER,
      ip_hash TEXT NOT NULL DEFAULT '', details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function getTestDb(): DatabaseType {
  return testDb;
}

export function createTestApp() {
  // Create in-memory database
  testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');
  testDb.pragma('foreign_keys = ON');
  runMigrations(testDb);

  // We need to mock the db module before importing routes
  // Since routes import db from connection.js, we'll use a different approach:
  // We'll dynamically construct route handlers that use our test db
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'shield-messenger-api', version: '0.1.0', timestamp: new Date().toISOString() });
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(errorHandler);

  return { app, db: testDb };
}
