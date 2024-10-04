import sequelize from './config';
import User from './models/user';
import TrademarkSearch from './models/trademarkSearch';
import Invoice from './models/invoice';
import ApiLog from './models/apiLog';
import Session from './models/sessions';
import UserPreference from './models/userPreference';
import Notification from './models/notification';
import AuditLog from './models/auditLog';
// Sync all models
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
  AuditLog
};
