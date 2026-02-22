import { db } from './connection.js';
import { logger } from '../logger.js';

/**
 * Database schema for Shield Messenger web services.
 *
 * Design principles:
 * - Complete isolation between billing identity and in-app identity
 * - Sensitive fields (email) are stored encrypted at the application layer
 * - No storage of private keys, messages, contacts, or in-app data
 * - Discovery entries only hold public-key fingerprints & encrypted onion addresses
 */
export function migrate() {
  logger.info('Running database migrations...');

  db.exec(`
    -- ============================================================
    -- 1. CMS / Content Management
    -- ============================================================
    CREATE TABLE IF NOT EXISTS cms_pages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL DEFAULT '',
      locale      TEXT NOT NULL DEFAULT 'en',
      published   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cms_posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      excerpt     TEXT NOT NULL DEFAULT '',
      body        TEXT NOT NULL DEFAULT '',
      author      TEXT NOT NULL DEFAULT 'Shield Messenger',
      locale      TEXT NOT NULL DEFAULT 'en',
      published   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cms_downloads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      platform    TEXT NOT NULL,            -- android, ios, web, desktop
      version     TEXT NOT NULL,
      url         TEXT NOT NULL,
      checksum    TEXT NOT NULL DEFAULT '', -- SHA-256 of the binary
      release_notes TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 2. Users & Billing (Subscriptions / Payments)
    --    NOTE: email is stored encrypted via application-layer crypto.
    --    No linkage to in-app identity (keys, onion, contacts).
    -- ============================================================
    CREATE TABLE IF NOT EXISTS users (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      username          TEXT NOT NULL UNIQUE,
      email_encrypted   TEXT NOT NULL DEFAULT '',  -- AES-256-GCM encrypted
      email_hash        TEXT NOT NULL DEFAULT '',  -- HMAC for lookup, NOT the plaintext
      password_hash     TEXT NOT NULL,
      role              TEXT NOT NULL DEFAULT 'user',  -- user | admin | superadmin
      subscription_tier TEXT NOT NULL DEFAULT 'free',  -- free | pro | enterprise
      subscription_expiry TEXT,
      is_banned         INTEGER NOT NULL DEFAULT 0,
      ban_reason        TEXT,
      last_login_at     TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_cents    INTEGER NOT NULL,
      currency        TEXT NOT NULL DEFAULT 'USD',
      payment_method  TEXT NOT NULL DEFAULT 'crypto', -- crypto | card | bank
      transaction_ref TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'pending', -- pending | completed | failed | refunded
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

    -- ============================================================
    -- 3. Support Tickets
    -- ============================================================
    CREATE TABLE IF NOT EXISTS support_tickets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      subject     TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'open',  -- open | in_progress | resolved | closed
      priority    TEXT NOT NULL DEFAULT 'normal', -- low | normal | high | urgent
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS support_messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id   INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender      TEXT NOT NULL DEFAULT 'user', -- user | staff
      body        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);

    -- ============================================================
    -- 4. Discovery Service (optional)
    --    Stores only: alias, public-key fingerprint, encrypted onion
    --    Server CANNOT read the actual onion address.
    -- ============================================================
    CREATE TABLE IF NOT EXISTS discovery_entries (
      alias                   TEXT PRIMARY KEY,           -- e.g. @ahmed
      public_key_fingerprint  TEXT NOT NULL,              -- SHA-256 of the user's public key
      onion_encrypted         TEXT NOT NULL DEFAULT '',   -- encrypted with searcher's pubkey
      created_at              TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 5. Anonymous Analytics (aggregated, no PII)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS analytics_daily (
      date            TEXT NOT NULL,      -- YYYY-MM-DD
      metric          TEXT NOT NULL,      -- downloads | active_users | new_users | messages_sent
      platform        TEXT NOT NULL DEFAULT 'all', -- android | ios | web | all
      value           INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date, metric, platform)
    );

    CREATE TABLE IF NOT EXISTS analytics_versions (
      version         TEXT NOT NULL,
      platform        TEXT NOT NULL,
      install_count   INTEGER NOT NULL DEFAULT 0,
      updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (version, platform)
    );

    -- ============================================================
    -- 6. Audit Log (security monitoring)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS audit_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      action      TEXT NOT NULL,      -- login | payment | ticket_create | discovery_register ...
      actor_id    INTEGER,            -- user ID if applicable (NULL for anonymous)
      ip_hash     TEXT NOT NULL DEFAULT '',  -- HMAC of IP, NOT the raw IP
      details     TEXT NOT NULL DEFAULT '',  -- JSON string, no PII
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

    -- ============================================================
    -- 7. Admin Sessions & Notifications
    -- ============================================================
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip_hash     TEXT NOT NULL DEFAULT '',
      user_agent  TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type        TEXT NOT NULL DEFAULT 'info',   -- info | warning | alert | system
      title       TEXT NOT NULL,
      body        TEXT NOT NULL DEFAULT '',
      is_read     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

    CREATE TABLE IF NOT EXISTS system_settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL DEFAULT '',
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── ALTER TABLE migrations for existing databases ────────
  const addColumnIfNotExists = (table: string, column: string, definition: string) => {
    const info = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!info.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      logger.info(`Added column ${table}.${column}`);
    }
  };

  addColumnIfNotExists('users', 'role', "TEXT NOT NULL DEFAULT 'user'");
  addColumnIfNotExists('users', 'is_banned', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfNotExists('users', 'ban_reason', 'TEXT');
  addColumnIfNotExists('users', 'last_login_at', 'TEXT');

  logger.info('Database migrations complete.');
}
