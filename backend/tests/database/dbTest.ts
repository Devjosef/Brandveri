import { Pool, QueryResult } from 'pg';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

// Simple database utility - no classes needed
export const testDb = {
  pool: new Pool({
    user: process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PASSWORD,
    host: process.env.TEST_DB_HOST,
    database: process.env.TEST_DB_NAME,
    port: Number(process.env.TEST_DB_PORT)
  }),

  async query<T extends QueryResult>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    try {
      const result = await this.pool.query<T>(sql, params);
      logger.debug({ sql }, 'Query executed');
      return result;
    } catch (error) {
      logger.error({ error, sql }, 'Query failed');
      throw error; 
    }
  },

  async cleanup(tables: string[]): Promise<void> {
    await this.query(`TRUNCATE ${tables.join(', ')} CASCADE`);
  },

  async close(): Promise<void> {
    await this.pool.end();
  }
};