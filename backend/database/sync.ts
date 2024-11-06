import sequelize from './config';
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

export const syncDatabase = async () => {
  try {
    // Sync all models
    await sequelize.sync({ force: false, alter: true });
    
    // Ensure indexes are created for each model
    for (const model of models) {
      if (model.options.indexes && model.options.indexes.length > 0) {
        await model.sync({ force: false, alter: true });
      }
    }
    
    console.log('Database and indexes synced successfully.');
  } catch (error) {
    console.error('Error syncing database:', error);
    throw error; // Re-throw to handle it in the calling code
  }
};

// Define model associations
const initializeAssociations = () => {
  User.hasMany(Payment, { foreignKey: 'user_id', as: 'payments' });
  User.hasMany(TrademarkSearch, { foreignKey: 'user_id', as: 'trademarkSearches' });
  User.hasMany(Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
  User.hasMany(UserPreference, { foreignKey: 'user_id', as: 'preferences' });
};

export {
  sequelize,
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
  initializeAssociations
};
