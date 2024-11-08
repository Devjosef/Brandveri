import { Options, Dialect, Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'test' | 'production';

interface DatabaseConfig {
  [key: string]: Options;
  development: Options;
  test: Options;
  production: Options;
}

const baseConfig: Omit<Options, 'host' | 'port' | 'username' | 'password' | 'database'> = {
  dialect: 'postgres' as Dialect,
  pool: {
    max: 20,
    min: 5,
    acquire: 60000,
    idle: 10000,
  },
  retry: {
    max: 3,
    backoffBase: 1000,
    backoffExponent: 1.5,
  },
  dialectOptions: {
    statement_timeout: 1000,
    idle_in_transaction_session_timeout: 10000,
  },
  logging: (msg: string) => console.debug('[Database]', msg),
};

const config: DatabaseConfig = {
  development: {
    ...baseConfig,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'brandveri_dev',
    ssl: false,
  },
  test: {
    ...baseConfig,
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    username: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || '',
    database: process.env.TEST_DB_NAME || 'brandveri_test',
    ssl: false,
    logging: false,
  },
  production: {
    ...baseConfig,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'brandveri',
    dialectOptions: {
      ...baseConfig.dialectOptions,
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: {
      ...baseConfig.pool,
      max: 50,
    },
    logging: false,
  },
};

const environment = (process.env.NODE_ENV || 'development') as NodeEnv;
const sequelize = new Sequelize(config[environment]);

export default sequelize;