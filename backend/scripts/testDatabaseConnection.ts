import sequelize from '../database/config';
import { Counter, Histogram } from 'prom-client';

// Metrics for database connection testing
const connectionMetrics = {
  attempts: new Counter({
    name: 'database_connection_attempts_total',
    help: 'Total number of database connection attempts',
    labelNames: ['status']
  }),
  duration: new Histogram({
    name: 'database_connection_duration_seconds',
    help: 'Duration of database connection attempts'
  })
};

export const testConnection = async () => {
  const end = connectionMetrics.duration.startTimer();
  try {
    connectionMetrics.attempts.inc({ status: 'attempt' });
    await sequelize.authenticate();
    connectionMetrics.attempts.inc({ status: 'success'});
    console.log('Connection to the database has been established successfully.');
    return true;
  } catch (error) {
    connectionMetrics.attempts.inc({ status: 'error' });
    console.error('Unable to connect to the database:', error);
    return false
  } finally {
    end();
  }
};

if (require.main === module) {
  testConnection();
}

