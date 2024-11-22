import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().transform(str => str.split(',')),
  CSP_REPORT_URI: z.string().default('/api/csp-report'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  AUTH_RATE_LIMIT_MAX: z.string().transform(Number).default('5'),
  SENSITIVE_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('3600000'),
  SENSITIVE_RATE_LIMIT_MAX: z.string().transform(Number).default('10'),
  PAYMENT_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  PAYMENT_RATE_LIMIT_MAX: z.string().transform(Number).default('30'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
});

// Validate environment variables at startup
const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('Invalid environment variables:', error);
    process.exit(1);
  }
};

export const Config = {
  ...validateEnv(),
  isProduction: process.env.NODE_ENV === 'production',
};