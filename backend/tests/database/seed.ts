import { testDb } from './dbTest';

export const seed = {
  // Seed data for tests
  async users() {
    const { rows } = await testDb.query(`
      INSERT INTO test_users (email) VALUES
        ('test1@example.com'),
        ('test2@example.com'),
        ('admin@example.com')
      RETURNING *
    `);
    return rows;
  },

  async trademarks(userId: number) {
    const { rows } = await testDb.query(`
      INSERT INTO test_trademarks (name, status, nice_classes, user_id) VALUES
        ('Brand One', 'PENDING', ARRAY[9,42], $1),
        ('Brand Two', 'REGISTERED', ARRAY[35], $1),
        ('Brand Three', 'REJECTED', ARRAY[25], $1)
      RETURNING *
    `, [userId]);
    return rows;
  }
};