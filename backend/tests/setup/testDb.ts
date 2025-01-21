import { DataSource, DataSourceOptions } from 'typeorm';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

/**
 * Test Database Configuration
 * Creates an isolated test database instance with clean state for each test run.
 * 
 * Environment Variables:
 * - TEST_DB_HOST: Database host (default: localhost)
 * - TEST_DB_PORT: Database port (default: 5432)
 * - TEST_DB_USER: Database user (default: test)
 * - TEST_DB_PASSWORD: Database password (default: test)
 * - TEST_DB_NAME: Database name (default: test_db)
 */
export const createTestDatabase = async (): Promise<DataSource> => {
  try {
    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      username: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      database: process.env.TEST_DB_NAME || 'test_db',
      synchronize: true, // Automatically creates a database schema.
      dropSchema: true,  // Ensures  a clean state for each test run.
      entities: ['src/entities/**/*.ts'],
      migrations: ['src/migrations/**/*.ts'],
      logging: process.env.NODE_ENV === 'test-debug', // Enable logging only in debug mode.
    } as DataSourceOptions);

    await dataSource.initialize();

    logger.info({
      database: {
        host: process.env.TEST_DB_HOST || 'localhost',
        name: process.env.TEST_DB_NAME || 'test_db'
      }
    }, 'Test database connected');

    return dataSource;
  } catch (error) {
    logger.error({ error }, 'Failed to create test database connection');
    throw error;
  }
};

/**
 * Cleanup function to ensure the database is properly closed.
 * @param dataSource Active database connection.
 */
export const closeTestDatabase = async (dataSource: DataSource): Promise<void> => {
  try {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
      logger.info('Test database connection closed');
    }
  } catch (error) {
    logger.error({ error }, 'Error closing test database connection');
    throw error;
  }
};