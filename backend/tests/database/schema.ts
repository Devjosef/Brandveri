import { testDb } from './dbTest';

interface Migration {
  version: number;
  name: string;
  up(): Promise<void>;
  down(): Promise<void>;
}

class TestSchema {
  private migrations: Migration[] = [
    {
      version: 1,
      name: 'create_trademarks_table',
      async up() {
        await testDb.query(`
          CREATE TABLE IF NOT EXISTS test_trademarks (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            status VARCHAR(50) NOT NULL,
            nice_classes INTEGER[],
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      },
      async down() {
        await testDb.query('DROP TABLE IF EXISTS test_trademarks CASCADE;');
      }
    },
    {
      version: 2,
      name: 'create_users_table',
      async up() {
        await testDb.query(`
          CREATE TABLE IF NOT EXISTS test_users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      },
      async down() {
        await testDb.query('DROP TABLE IF EXISTS test_users CASCADE;');
      }
    },
    {
      version: 3,
      name: 'add_user_id_to_trademarks',
      async up() {
        await testDb.query(`
          ALTER TABLE test_trademarks
          ADD COLUMN user_id INTEGER REFERENCES test_users(id);
        `);
      },
      async down() {
        await testDb.query(`
          ALTER TABLE test_trademarks
          DROP COLUMN user_id;
        `);
      }
    }
  ];

  private async getCurrentVersion(): Promise<number> {
    try {
      const { rows } = await testDb.query(
        'SELECT version FROM test_schema_versions ORDER BY version DESC LIMIT 1'
      );
      const result = rows[0] as unknown as { version: number } | undefined;
      return result?.version || 0;
    } catch {
      await this.createVersionTable();
      return 0;
    }
  }

  private async createVersionTable(): Promise<void> {
    await testDb.query(`
      CREATE TABLE IF NOT EXISTS test_schema_versions (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private async setVersion(version: number, name: string): Promise<void> {
    await testDb.query(
      'INSERT INTO test_schema_versions (version, name) VALUES ($1, $2)',
      [version, name]
    );
  }

  private async removeVersion(version: number): Promise<void> {
    await testDb.query(
      'DELETE FROM test_schema_versions WHERE version = $1',
      [version]
    );
  }

  async migrate(targetVersion?: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const maxVersion = targetVersion ?? Math.max(...this.migrations.map(m => m.version));

    if (currentVersion === maxVersion) {
      return;
    }

    if (currentVersion > maxVersion) {
      await this.rollback(currentVersion - maxVersion);
      return;
    }

    const pendingMigrations = this.migrations
      .filter(m => m.version > currentVersion && m.version <= maxVersion)
      .sort((a, b) => a.version - b.version);

    for (const migration of pendingMigrations) {
      try {
        await migration.up();
        await this.setVersion(migration.version, migration.name);
      } catch (error) {
        console.error(`Migration ${migration.version} failed:`, error);
        // Rollback this migration
        try {
          await migration.down();
        } catch (rollbackError) {
          console.error(`Rollback of migration ${migration.version} failed:`, rollbackError);
        }
        throw error;
      }
    }
  }

  async rollback(steps: number = 1): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const migrations = this.migrations
      .filter(m => m.version <= currentVersion)
      .sort((a, b) => b.version - a.version)
      .slice(0, steps);

    for (const migration of migrations) {
      try {
        await migration.down();
        await this.removeVersion(migration.version);
      } catch (error) {
        console.error(`Rollback of migration ${migration.version} failed:`, error);
        throw error;
      }
    }
  }

  async reset(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    await this.rollback(currentVersion);
  }
}

export const schema = new TestSchema();