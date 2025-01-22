import { testDb } from '../baseUtility';
import { loggers } from '../../../observability/contextLoggers';
import { testErrors } from '../../error/error';

const logger = loggers.test;

interface TestData {
  id: number;
  name: string;
  status: string;
}

export class TestRepository {
  async create(data: Omit<TestData, 'id'>): Promise<TestData> {
    try {
      const result = await testDb.query<TestData>(
        'INSERT INTO test_trademarks (name, status) VALUES ($1, $2) RETURNING *',
        [data.name, data.status]
      );
      logger.debug({ data }, 'Test data created');
      return result.rows[0];
    } catch (error) {
      throw testErrors.database({
        operation: 'create',
        data,
        error: error.message
      });
    }
  }

  async findById(id: number): Promise<TestData | null> {
    try {
      const result = await testDb.query<TestData>(
        'SELECT * FROM test_trademarks WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw testErrors.database({
        operation: 'findById',
        id,
        error: error.message
      });
    }
  }
}

// Single instance for all tests
export const testRepository = new TestRepository();