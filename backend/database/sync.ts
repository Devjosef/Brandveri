import { Sequelize } from 'sequelize';
import logger from '../utils/logger';  // Assuming you have a logger utility
import User from './models/User';
import TrademarkSearch from './models/trademarkSearch';
import Invoice from './models/Invoice';
import ApiLog from './models/ApiLog';
import UserPreference from './models/UserPreference';
import Notification from './models/Notification';
import AuditLog from './models/AuditLog';
import Session from './models/sessions';
import Payment from './models/Payment';
import Recommendation from './models/recommendation';
import RecommendationLog from './models/recommendationLogs';
import Subscription from './models/Subscription';

const models = [
  User,
  TrademarkSearch,
  Invoice,
  ApiLog,
  UserPreference,
  Notification,
  AuditLog,
  Session,
  Payment,
  Recommendation,
  RecommendationLog,
  Subscription
];

interface SyncOptions {
  force?: boolean;
  alter?: boolean;
  logging?: boolean;
  retry?: number;
}

class DatabaseSync {
  private sequelize: Sequelize;
  private retryAttempts: number = 3;
  private retryDelay: number = 5000;

  constructor(sequelizeInstance: Sequelize) {
    this.sequelize = sequelizeInstance;
  }

  private async waitFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async testConnection(): Promise<boolean> {
    try {
      await this.sequelize.authenticate();
      logger.info('Database connection established successfully');
      return true;
    } catch (error) {
      logger.error('Unable to connect to the database:', error);
      return false;
    }
  }

  private async syncModel(model: any, options: SyncOptions): Promise<void> {
    const modelName = model.name;
    try {
      await model.sync(options);
      if (model.options.indexes?.length > 0) {
        await model.sync({ ...options, force: false });
      }
      logger.info(`Successfully synced model: ${modelName}`);
    } catch (error) {
      logger.error(`Error syncing model ${modelName}:`, error);
      throw new Error(`Failed to sync model ${modelName}: ${error.message}`);
    }
  }

  public async syncDatabase(options: SyncOptions = {}): Promise<void> {
    const {
      force = false,
      alter = true,
      logging = true,
      retry = this.retryAttempts
    } = options;

    let attempts = 0;
    let success = false;

    while (attempts < retry && !success) {
      try {
        if (!(await this.testConnection())) {
          throw new Error('Database connection test failed');
        }

        logger.info('Starting database synchronization...');
        
        // Begin transaction for atomic updates
        const transaction = await this.sequelize.transaction();

        try {
          // Sync all models
          for (const model of models) {
            await this.syncModel(model, { force, alter, logging });
          }

          // Initialize associations
          this.initializeAssociations();

          await transaction.commit();
          success = true;
          logger.info('Database and indexes synced successfully');

        } catch (error) {
          await transaction.rollback();
          throw error;
        }

      } catch (error) {
        attempts++;
        logger.error(`Database sync attempt ${attempts} failed:`, error);

        if (attempts === retry) {
          logger.error('Max retry attempts reached. Database sync failed.');
          throw new Error(`Database synchronization failed after ${retry} attempts: ${error.message}`);
        }

        logger.info(`Retrying in ${this.retryDelay / 1000} seconds...`);
        await this.waitFor(this.retryDelay);
      }
    }
  }

  private initializeAssociations(): void {
    try {
      // User associations
      User.hasMany(Payment, { foreignKey: 'user_id', as: 'payments', onDelete: 'CASCADE' });
      User.hasMany(TrademarkSearch, { foreignKey: 'user_id', as: 'trademarkSearches', onDelete: 'CASCADE' });
      User.hasMany(Subscription, { foreignKey: 'user_id', as: 'subscriptions', onDelete: 'CASCADE' });
      User.hasMany(UserPreference, { foreignKey: 'user_id', as: 'preferences', onDelete: 'CASCADE' });
      User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications', onDelete: 'CASCADE' });
      User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs', onDelete: 'CASCADE' });
      User.hasMany(ApiLog, { foreignKey: 'user_id', as: 'apiLogs', onDelete: 'SET NULL' });

      // Add other model associations here
      logger.info('Model associations initialized successfully');
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Error initializing model associations:', error);
        throw new Error(`Failed to initialize associations: ${error.message}`);
      } else {
        logger.error('Unknown error initializing model associations');
        throw new Error('Failed to initialize associations due to an unknown error');
      }
    }
  }
}

const databaseSync = new DatabaseSync(Sequelize);

export {
  Sequelize,
  models,
  User,
  TrademarkSearch,
  Invoice,
  ApiLog,
  Session,
  UserPreference,
  Notification,
  AuditLog,
  Payment,
  Recommendation,
  RecommendationLog,
  Subscription,
  databaseSync
};
