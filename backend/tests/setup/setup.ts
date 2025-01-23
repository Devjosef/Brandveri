import { DataSource } from 'typeorm';
import { loggers } from '../../observability/contextLoggers';
import Redis from 'ioredis';

const logger = loggers.test;

// Single test database instance.
export const testDb = new DataSource({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: Number(process.env.TEST_DB_PORT) || 5432,
  username: process.env.TEST_DB_USER || 'test',
  password: process.env.TEST_DB_PASSWORD || 'test',
  database: process.env.TEST_DB_NAME || 'test_db',
  synchronize: true,  // Auto-create the schema
  dropSchema: true,   // A clean state for tests
  entities: ['src/entities/**/*.ts'],
  logging: false      // No noise during tests.
});

// Single Redis instance for tests
export const testRedis = new Redis({
  host: process.env.TEST_REDIS_HOST || 'localhost',
  port: Number(process.env.TEST_REDIS_PORT) || 6379,
  db: 1,  // Separate DB for tests
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 1000
});

// Initialize test connections.
beforeAll(async () => {
  try {
    await testDb.initialize();
    logger.info('Test database connected');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to test database');
    process.exit(1);  // Fail fast if the DB isn't available.
  }
});

// Clean up after tests.
afterAll(async () => {
  await Promise.all([
    testDb.destroy(),
    testRedis.quit()
  ]).catch(error => {
    logger.error({ error }, 'Error closing test connections');
  });
});