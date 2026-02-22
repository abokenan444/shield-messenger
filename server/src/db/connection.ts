import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../logger.js';
import fs from 'node:fs';
import path from 'node:path';

// Ensure data directory exists
const dbDir = path.dirname(config.db.sqlitePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db: DatabaseType = new Database(config.db.sqlitePath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

logger.info(`SQLite database opened: ${config.db.sqlitePath}`);
