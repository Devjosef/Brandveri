import { DataSource, QueryRunner } from 'typeorm';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

/**
 * Test Utility Functions,
 * Common helper functions for testing the database operations, API calls, and data validation.
 */

/**
 * Clears all tables in the database,
 * @param dataSource Active database connection.
 */
export const clearDatabase = async (dataSource: DataSource): Promise<void> => {
  try {
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.clear();
    }
    logger.debug('Database cleared');
  } catch (error) {
    logger.error({ error }, 'Failed to clear database');
    throw error;
  }
};

/**
 * Creates a test transaction, and rolls it back after the test.
 * @param dataSource Active database connection.
 * @param testFn Function to execute within transaction.
 */
export const withTransaction = async <T>(
  dataSource: DataSource,
  testFn: (queryRunner: QueryRunner) => Promise<T>
): Promise<T> => {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await testFn(queryRunner);
    await queryRunner.rollbackTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

/**
 * Validates that an error matches, the expected properties,
 * @param error Error to validate,
 * @param expectedProps Expected error properties.
 */
export const validateError = (error: any, expectedProps: Record<string, any>): void => {
  Object.entries(expectedProps).forEach(([key, value]) => {
    expect(error[key]).toBe(value);
  });
};
