/**
 * Test setup — set required environment variables before any import
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // let OS pick a random port
process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing-do-not-use-elsewhere!!!!';
process.env.JWT_EXPIRES_IN = '1h';
process.env.SQLITE_PATH = ':memory:';
process.env.FIELD_ENCRYPTION_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.DISCOVERY_ENABLED = 'true';
process.env.ANALYTICS_ENABLED = 'true';
process.env.RATE_LIMIT_MAX = '1000'; // disable rate limiting in tests
