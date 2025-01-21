import { createTestDatabase, closeTestDatabase } from './testDb';
import { DataSource } from 'typeorm';
import redisClient from '../../cache/redis';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

let dataSource: DataSource;

// Global setup - runs once before all tests
beforeAll(async () => {
  try {
    // Initialize test database
    dataSource = await createTestDatabase();
    
    // Initialize Redis for testing
    await redisClient.connect();
    
    logger.info('Test environment initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize test environment');
    throw error;
  }
});

// Global teardown - runs once after all tests
afterAll(async () => {
  try {
    // Cleanup database connection
    await closeTestDatabase(dataSource);
    
    // Cleanup Redis connection
    await redisClient.quit();
    
    logger.info('Test environment cleaned up');
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup test environment');
    throw error;
  }
});

// Reset state between tests
afterEach(async () => {
  try {
    // Clear database tables
    if (dataSource?.isInitialized) {
      const entities = dataSource.entityMetadatas;
      for (const entity of entities) {
        const repository = dataSource.getRepository(entity.name);
        await repository.clear();
      }
    }
    
    // Clear Redis cache
    await redisClient.flushall();
    
    logger.debug('Test state reset completed');
  } catch (error) {
    logger.error({ error }, 'Failed to reset test state');
    throw error;
  }
});