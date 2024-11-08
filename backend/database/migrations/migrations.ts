import { Umzug, SequelizeStorage, MigrationParams } from 'umzug';
import { Sequelize, Transaction, QueryInterface } from 'sequelize';

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
        glob: ['migrations/*.ts', { cwd: __dirname }],
        resolve: (params: MigrationParams<MigrationContext>) => {
          if (!params.path) {
            throw new Error('Migration path is undefined');
          }
          const migration = require(params.path) as MigrationFile;
          return {
            up: async (context: MigrationContext) => {
              await migration.up(
                context.queryInterface,
                context.sequelize,
                context.transaction
              );
            },
            down: async (context: MigrationContext) => {
              await migration.down(
                context.queryInterface,
                context.sequelize,
                context.transaction
              );
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
      if (pending.length > 0) {
        console.log(`Running ${pending.length} migrations...`);
        await this.umzug.up();
      }
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }
}

export default MigrationManager;
