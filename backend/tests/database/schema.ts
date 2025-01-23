import { testDb } from '../dbTest';

// Test schema management 
export const schema = {
  async create() {
    await testDb.query(`
      CREATE TABLE IF NOT EXISTS test_trademarks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        nice_classes INTEGER[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS test_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  },

  async drop() {
    await testDb.query(`
      DROP TABLE IF EXISTS test_trademarks, test_users CASCADE;
    `);
  }
};