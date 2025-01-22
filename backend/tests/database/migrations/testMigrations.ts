import { testDb } from '../baseUtility';
import { loggers } from '../../../observability/contextLoggers';
import { testErrors } from '../../error/error';

const logger = loggers.test;

export const testMigrations = {
  async createTables() {
    try {
      await testDb.query(`
        CREATE TABLE IF NOT EXISTS test_trademarks (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL,
          nice_classes INTEGER[],
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS test_users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      logger.debug('Test tables created');
    } catch (error) {
      throw testErrors.database({
        operation: 'createTables',
        error: error.message
      });
    }
  },

  async dropTables() {
    try {
      await testDb.query(`
        DROP TABLE IF EXISTS test_trademarks CASCADE;
        DROP TABLE IF EXISTS test_users CASCADE;
      `);
      logger.debug('Test tables dropped');
    } catch (error) {
      throw testErrors.database({
        operation: 'dropTables',
        error: error.message
      });
    }
  }
};