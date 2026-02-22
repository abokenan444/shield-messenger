import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  db: {
    postgresUrl: process.env.DATABASE_URL || '',
    sqlitePath: process.env.SQLITE_PATH || './data/shield_messenger.db',
  },

  fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY || '',

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  corsOrigin: process.env.CORS_ORIGIN || 'https://shieldmessenger.com',

  discovery: {
    enabled: process.env.DISCOVERY_ENABLED === 'true',
  },

  analytics: {
    enabled: process.env.ANALYTICS_ENABLED === 'true',
  },
} as const;
