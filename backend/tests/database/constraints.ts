import { testDb } from './dbTest';

export const constraints = {
  async testForeignKeys() {
    try {
      // Should fail due to the FK constraint (fk = Foreign Keys)
      await testDb.query(`
        INSERT INTO test_trademarks (name, status, user_id)
        VALUES ('Test', 'PENDING', 999999)
      `);
      throw new Error('FK constraint failed');
    } catch (error: unknown) {
      if (!DatabaseError.isForeignKeyViolation(error)) {
        throw error;
      }
    }
  },

  async testUnique() {
    try {
      // Should fail due to unique constraint
      await testDb.query(`
        INSERT INTO test_users (email)
        VALUES ('test1@example.com'),
               ('test1@example.com')
      `);
      throw new Error('Unique constraint failed');
    } catch (error: unknown) {
      if (!DatabaseError.isUniqueViolation(error)) {
        throw error;
      }
    }
  }
};

class DatabaseError extends Error {
  constructor(
    public readonly code: string,
    public readonly detail: string,
    message: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }

  static isForeignKeyViolation(error: unknown): error is DatabaseError {
    return error instanceof DatabaseError && error.code === '23503';
  }

  static isUniqueViolation(error: unknown): error is DatabaseError {
    return error instanceof DatabaseError && error.code === '23505';
  }
}