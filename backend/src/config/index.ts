import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Service-specific configuration
const serviceConfig = {
  trademark: {
    ports: [4001, 4002],
    host: process.env.TRADEMARK_SERVICE_HOST || 'localhost'
  },
  copyright: {
    ports: [4003, 4004],
    host: process.env.COPYRIGHT_SERVICE_HOST || 'localhost'
  },
  recommendation: {
    ports: [4005, 4006],
    host: process.env.RECOMMENDATION_SERVICE_HOST || 'localhost'
  }
};

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  services: serviceConfig,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'dev_db'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  security: {
    jwtSecret: process.env.JWT_SECRET,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
  }
};

export type Config = typeof config;