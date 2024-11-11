import { Sequelize } from 'sequelize';
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

interface DatabaseError extends Error {
  code?: string;
  sqlState?: string;
  sql?: string;
}

class DatabaseSync {
  private sequelize: Sequelize;
  private retryAttempts: number = 3;
  private retryDelay: number = 5000;
  private metrics: {
    syncAttempts: number;
    lastSyncTime: number;
    errors: DatabaseError[];
  };

  constructor(sequelizeInstance: Sequelize) {
    this.sequelize = sequelizeInstance;
    this.metrics = {
      syncAttempts: 0,
      lastSyncTime: 0,
      errors: []
    };
  }

  private async waitFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async testConnection(): Promise<boolean> {
    try {
      await this.sequelize.authenticate();
      console.debug('[Database] Connection established successfully');
      return true;
    } catch (error) {
      this.metrics.errors.push(error as DatabaseError);
      console.error('[Database] Connection test failed:', error);
      return false;
    }
  }

  private async syncModel(model: any, options: SyncOptions): Promise<void> {
    const modelName = model.name;
    const startTime = Date.now();
  
    try {
      await model.sync(options);
      if (model.options.indexes?.length > 0) {
        await model.sync({ ...options, force: false });
      }
      
      const syncTime = Date.now() - startTime;
      console.debug(`[Database] Synced model ${modelName} in ${syncTime}ms`);
      
    } catch (error: unknown) {
      this.metrics.errors.push(error as DatabaseError);
      if (error instanceof Error) {
        throw new Error(`Failed to sync model ${modelName}: ${error.message}`);
      }
      throw new Error(`Failed to sync model ${modelName}: Unknown error occurred`);
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
    const startTime = Date.now();

    while (attempts < retry && !success) {
      try {
        this.metrics.syncAttempts++;
        
        if (!(await this.testConnection())) {
          throw new Error('Database connection test failed');
        }

        console.info('[Database] Starting synchronization...');
        const transaction = await this.sequelize.transaction();

        try {
          for (const model of models) {
            await this.syncModel(model, { force, alter, logging });
          }

          await this.initializeAssociations();
          await transaction.commit();
          
          success = true;
          this.metrics.lastSyncTime = Date.now() - startTime;
          
          console.info(`[Database] Sync completed in ${this.metrics.lastSyncTime}ms`);

        } catch (error) {
          await transaction.rollback();
          throw error;
        }

      } catch (error: unknown) {
        attempts++;
        this.metrics.errors.push(error as DatabaseError);
        console.error(`[Database] Sync attempt ${attempts} failed:`, error);
      
        if (attempts === retry) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Unknown error occurred';
          
          const finalError = new Error(
            `Database synchronization failed after ${retry} attempts: ${errorMessage}`
          );
          console.error('[Database] Max retry attempts reached:', finalError);
          throw finalError;
        }
      
        console.info(`[Database] Retrying in ${this.retryDelay / 1000}s...`);
        await this.waitFor(this.retryDelay);
      }
    }
  }

  private async initializeAssociations(): Promise<void> {
    try {
      for (const model of models) {
        if ('associate' in model && typeof model.associate === 'function') {
          model.associate();
        }
      }
      console.debug('[Database] Model associations initialized');
    } catch (error) {
      console.error('[Database] Association initialization failed:', error);
      throw error;
    }
  }

  public getMetrics(): typeof this.metrics {
    return this.metrics;
  }
}

const databaseSync = new DatabaseSync(new Sequelize());

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
