/**
 * Integration tests for database migration.
 * Verifies all 11 tables are created correctly with an in-memory SQLite.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database, { type Database as DatabaseType } from 'better-sqlite3';

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

describe('database migrations', () => {
  let db: DatabaseType;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
  });

  afterEach(() => {
    db.close();
  });

  it('should create all 11 tables', () => {
    runMigrations(db);
    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    ).all() as { name: string }[];

    const tableNames = tables.map(t => t.name).sort();
    expect(tableNames).toEqual([
      'analytics_daily', 'analytics_versions', 'audit_log',
      'cms_downloads', 'cms_pages', 'cms_posts',
      'discovery_entries', 'payments',
      'support_messages', 'support_tickets', 'users',
    ]);
  });

  it('should run migrations idempotently (no error on second run)', () => {
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });

  // ─── CMS tables ───

  it('should insert and query CMS pages', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO cms_pages (slug, title, body, published) VALUES (?, ?, ?, 1)`)
      .run('about', 'About Us', 'We are Shield Messenger');
    const page = db.prepare(`SELECT * FROM cms_pages WHERE slug = ?`).get('about') as any;
    expect(page.title).toBe('About Us');
    expect(page.published).toBe(1);
  });

  it('should enforce unique slug on cms_pages', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO cms_pages (slug, title) VALUES (?, ?)`).run('home', 'Home');
    expect(() => db.prepare(`INSERT INTO cms_pages (slug, title) VALUES (?, ?)`).run('home', 'Home2')).toThrow();
  });

  it('should insert and query CMS posts', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO cms_posts (slug, title, excerpt, body, published) VALUES (?, ?, ?, ?, 1)`)
      .run('first', 'First Post', 'Summary', 'Full body');
    const post = db.prepare(`SELECT * FROM cms_posts WHERE slug = ?`).get('first') as any;
    expect(post.title).toBe('First Post');
    expect(post.author).toBe('Shield Messenger');
  });

  // ─── Users & Payments ───

  it('should insert and query users', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO users (username, password_hash) VALUES (?, ?)`).run('alice', '$2b$12$hash');
    const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get('alice') as any;
    expect(user.subscription_tier).toBe('free');
    expect(user.id).toBe(1);
  });

  it('should enforce unique username', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO users (username, password_hash) VALUES (?, ?)`).run('alice', 'hash1');
    expect(() =>
      db.prepare(`INSERT INTO users (username, password_hash) VALUES (?, ?)`).run('alice', 'hash2')
    ).toThrow();
  });

  it('should cascade delete payments when user is deleted', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO users (username, password_hash) VALUES (?, ?)`).run('bob', 'hash');
    db.prepare(`INSERT INTO payments (user_id, amount_cents) VALUES (1, 499)`).run();
    db.prepare(`DELETE FROM users WHERE id = 1`).run();
    const payments = db.prepare(`SELECT * FROM payments WHERE user_id = 1`).all();
    expect(payments).toHaveLength(0);
  });

  // ─── Support ───

  it('should insert and query support tickets and messages', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO users (username, password_hash) VALUES (?, ?)`).run('user1', 'hash');
    db.prepare(`INSERT INTO support_tickets (user_id, subject, priority) VALUES (?, ?, ?)`).run(1, 'Help!', 'high');
    db.prepare(`INSERT INTO support_messages (ticket_id, sender, body) VALUES (?, ?, ?)`).run(1, 'user', 'I need help');

    const ticket = db.prepare(`SELECT * FROM support_tickets WHERE id = 1`).get() as any;
    expect(ticket.subject).toBe('Help!');
    expect(ticket.status).toBe('open');

    const messages = db.prepare(`SELECT * FROM support_messages WHERE ticket_id = 1`).all() as any[];
    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe('I need help');
  });

  it('should cascade delete support messages when ticket is deleted', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO support_tickets (subject) VALUES (?)`).run('Test');
    db.prepare(`INSERT INTO support_messages (ticket_id, body) VALUES (1, 'msg1')`).run();
    db.prepare(`INSERT INTO support_messages (ticket_id, body) VALUES (1, 'msg2')`).run();
    db.prepare(`DELETE FROM support_tickets WHERE id = 1`).run();
    const msgs = db.prepare(`SELECT * FROM support_messages WHERE ticket_id = 1`).all();
    expect(msgs).toHaveLength(0);
  });

  // ─── Discovery ───

  it('should insert and query discovery entries', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO discovery_entries (alias, public_key_fingerprint, onion_encrypted) VALUES (?, ?, ?)`)
      .run('@alice', 'abc123def456abcd', 'encrypted-onion');
    const entry = db.prepare(`SELECT * FROM discovery_entries WHERE alias = ?`).get('@alice') as any;
    expect(entry.public_key_fingerprint).toBe('abc123def456abcd');
  });

  it('should enforce unique alias in discovery_entries', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO discovery_entries (alias, public_key_fingerprint) VALUES (?, ?)`).run('@test', 'fp1');
    expect(() =>
      db.prepare(`INSERT INTO discovery_entries (alias, public_key_fingerprint) VALUES (?, ?)`).run('@test', 'fp2')
    ).toThrow();
  });

  // ─── Analytics ───

  it('should insert and aggregate analytics', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO analytics_daily (date, metric, platform, value) VALUES ('2026-01-01', 'downloads', 'android', 100)`).run();
    db.prepare(`INSERT INTO analytics_daily (date, metric, platform, value) VALUES ('2026-01-01', 'downloads', 'ios', 50)`).run();

    const total = db.prepare(`SELECT SUM(value) as total FROM analytics_daily WHERE metric = 'downloads'`).get() as any;
    expect(total.total).toBe(150);
  });

  it('should support upsert via ON CONFLICT on analytics_daily', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO analytics_daily (date, metric, platform, value) VALUES ('2026-02-01', 'active_users', 'all', 10)`).run();
    db.prepare(`
      INSERT INTO analytics_daily (date, metric, platform, value) VALUES ('2026-02-01', 'active_users', 'all', 5)
      ON CONFLICT(date, metric, platform) DO UPDATE SET value = value + excluded.value
    `).run();

    const row = db.prepare(`SELECT value FROM analytics_daily WHERE date = '2026-02-01' AND metric = 'active_users'`).get() as any;
    expect(row.value).toBe(15);
  });

  // ─── Audit Log ───

  it('should insert audit log entries', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO audit_log (action, actor_id, ip_hash, details) VALUES (?, ?, ?, ?)`).run('login', 1, 'hashed-ip', '{}');
    const entries = db.prepare(`SELECT * FROM audit_log WHERE action = 'login'`).all();
    expect(entries).toHaveLength(1);
  });

  it('should auto-set created_at timestamps', () => {
    runMigrations(db);
    db.prepare(`INSERT INTO audit_log (action, ip_hash) VALUES (?, ?)`).run('test', 'hash');
    const entry = db.prepare(`SELECT created_at FROM audit_log WHERE id = 1`).get() as any;
    expect(entry.created_at).toBeTruthy();
    // Should be a valid date string
    expect(new Date(entry.created_at).getTime()).toBeGreaterThan(0);
  });
});
