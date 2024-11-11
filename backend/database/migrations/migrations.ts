import { Umzug, SequelizeStorage, MigrationParams } from 'umzug';
import { Sequelize, Transaction, QueryInterface } from 'sequelize';
import path from 'path';

interface MigrationContext {
  transaction: Transaction;
  queryInterface: QueryInterface;
  sequelize: Sequelize;
}

interface MigrationFile {
  up: (queryInterface: QueryInterface, sequelize: Sequelize, transaction: Transaction) => Promise<void>;
  down: (queryInterface: QueryInterface, sequelize: Sequelize, transaction: Transaction) => Promise<void>;
}

class MigrationManager {
  private umzug: Umzug<MigrationContext>;
  private sequelize: Sequelize;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
    this.umzug = new Umzug({
      migrations: {
        glob: ['*.ts', { cwd: path.join(__dirname, 'migrations') }],
        resolve: ({ name, path: migrationPath }: MigrationParams<MigrationContext>) => {
          if (!migrationPath) {
            throw new Error(`Migration path is undefined for ${name}`);
          }

          // Dynamically import the migration file
          const migration = require(migrationPath) as MigrationFile;

          return {
            name,
            up: async ({ context }: { context: MigrationContext }) => {
              const { transaction, queryInterface, sequelize } = context;
              
              try {
                await migration.up(queryInterface, sequelize, transaction);
                await transaction.commit();
              } catch (error) {
                await transaction.rollback();
                throw error;
              }
            },
            down: async ({ context }: { context: MigrationContext }) => {
              const { transaction, queryInterface, sequelize } = context;
              
              try {
                await migration.down(queryInterface, sequelize, transaction);
                await transaction.commit();
              } catch (error) {
                await transaction.rollback();
                throw error;
              }
            }
          };
        },
      },
      context: async () => ({
        transaction: await this.sequelize.transaction(),
        queryInterface: this.sequelize.getQueryInterface(),
        sequelize: this.sequelize,
      }),
      storage: new SequelizeStorage({ 
        sequelize: this.sequelize,
        tableName: 'migrations'
      }),
      logger: console,
    });
  }

  async migrate(): Promise<boolean> {
    try {
      const pending = await this.umzug.pending();
      
      if (pending.length === 0) {
        console.log('No pending migrations');
        return true;
      }

      console.log(`Running ${pending.length} migrations...`);
      const migrations = await this.umzug.up();
      
      console.log('Migrations completed:', migrations.map(m => m.name).join(', '));
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }

  async revert(steps: number = 1): Promise<boolean> {
    try {
      const executed = await this.umzug.executed();
      
      if (executed.length === 0) {
        console.log('No migrations to revert');
        return true;
      }

      console.log(`Reverting ${steps} migration(s)...`);
      const migrations = await this.umzug.down({ step: steps });
      
      console.log('Reverted migrations:', migrations.map(m => m.name).join(', '));
      return true;
    } catch (error) {
      console.error('Revert failed:', error);
      return false;
    }
  }
}

export default MigrationManager;
