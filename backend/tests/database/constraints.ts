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
      if ((error as { code?: string }).code !== '23503') { // FK violation
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
      if ((error as { code?: string }).code !== '23505') { // Unique violation
        throw error;
      }
    }
  }
};