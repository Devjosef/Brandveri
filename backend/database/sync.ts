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

export const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: false });
    console.log('Database synced successfully.');
  } catch (error) {
    console.error('Error syncing database:', error);
  }
};

export {
  sequelize,
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
  Subscription
};
