import { testDb } from './dbTest';
import { loggers } from '../../observability/contextLoggers';
import { QueryResult } from 'pg';

const logger = loggers.test;


interface TransactionClient {
  query<T extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  release(): void;
}

export const transactions = {
  async withTransaction<T>(
    callback: (client: TransactionClient) => Promise<T>,
    _options?: { 
      isolation?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE',
      timeout?: number 
    }
  ): Promise<T> {
    const client = await testDb.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback({
        query: client.query.bind(client),
        release: client.release.bind(client)
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