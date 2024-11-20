import { z } from 'zod';

// Environment schema for logger configuration
const loggerEnvSchema = z.object({
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return loggerEnvSchema.parse({
      LOG_LEVEL: process.env.LOG_LEVEL,
      NODE_ENV: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('Invalid environment configuration:', error);
    process.exit(1);
  }
};

export const env = parseEnv();