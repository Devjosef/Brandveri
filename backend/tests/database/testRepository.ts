import { testDb } from './dbTest';

// Simple repository functions.
export const repositories = {
  trademark: {
    async create(data: { name: string; status: string }) {
      const { rows } = await testDb.query(
        'INSERT INTO test_trademarks (name, status) VALUES ($1, $2) RETURNING *',
        [data.name, data.status]
      );
      return rows[0];
    },

    async findById(id: number) {
      const { rows } = await testDb.query(
        'SELECT * FROM test_trademarks WHERE id = $1',
        [id]
      );
      return rows[0] || null;
    }
  },

  user: {
    async create(data: { email: string }) {
      const { rows } = await testDb.query(
        'INSERT INTO test_users (email) VALUES ($1) RETURNING *',
        [data.email]
      );
      return rows[0];
    }
  }
};