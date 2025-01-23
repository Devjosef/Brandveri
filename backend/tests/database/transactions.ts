import { testDb } from './dbTest';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

export const transactions = {
  async withTransaction<T>(
    callback: (client: typeof testDb) => Promise<T>
  ): Promise<T> {
    const client = await testDb.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback({
        pool: testDb.pool,
        query: client.query.bind(client),
        cleanup: testDb.cleanup.bind(testDb),
        close: testDb.close.bind(testDb)
      });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error }, 'Transaction failed');
      throw error;
    } finally {
      client.release();
    }
  },

  // Test concurrent operations
  async testConcurrency() {
    return this.withTransaction(async (client) => {
      await client.query('SELECT pg_advisory_lock(1)');
      // Test concurrent access here
      await client.query('SELECT pg_advisory_unlock(1)');
    });
  }
};