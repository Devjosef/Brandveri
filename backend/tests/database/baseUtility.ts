import { loggers } from '../../observability/contextLoggers';
import { testErrors } from '../error/error';
import { Pool, QueryResult } from 'pg';

const logger = loggers.test;

/**
 * Basic database operations for tests
 */
export class TestDatabase {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: process.env.TEST_DB_USER,
      password: process.env.TEST_DB_PASSWORD,
      host: process.env.TEST_DB_HOST,
      database: process.env.TEST_DB_NAME,
      port: Number(process.env.TEST_DB_PORT)
    });
  }

  /**
   * Execute a query with error handling
   */
  async query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    try {
      const result = await this.pool.query<T>(sql, params);
      logger.debug({ sql, params }, 'Query executed');
      return result;
    } catch (error) {
      throw testErrors.database({
        sql,
        params,
        error: error.message
      });
    }
  }

  /**
   * Clean test data
   */
  async cleanup(tables: string[]): Promise<void> {
    try {
      for (const table of tables) {
        await this.query(`TRUNCATE ${table} CASCADE`);
      }
      logger.debug({ tables }, 'Tables cleaned');
    } catch (error) {
      throw testErrors.database({
        operation: 'cleanup',
        tables,
        error: error.message
      });
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.debug('Database connection closed');
  }
}

// Single instance for all tests
export const testDb = new TestDatabase();