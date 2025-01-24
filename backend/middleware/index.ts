import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_URL: z.string().optional().default('http://localhost:3000'),
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
  PORT: z.string().default('3000'),
  LOG_LEVEL: z.string().default('info'),
  DB_HOST: z.string(),
  DB_PORT: z.string(),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),
  
  // Stripe Configuration.
  STRIPE_PUBLIC_KEY: z.string({
    required_error: "Stripe public key is required"
  }).refine((key) => key.startsWith('pk_'), {
    message: "Invalid Stripe public key format"
  }),
  
  STRIPE_RESTRICTED_KEY: z.string({
    required_error: "Stripe restricted key is required"
  }).refine((key) => key.startsWith('rk_'), {
    message: "Invalid Stripe restricted key format"
  }),
  
  STRIPE_SECRET_KEY: z.string({
    required_error: "Stripe secret key is required"
  }).refine((key) => key.startsWith('sk_'), {
    message: "Invalid Stripe secret key format"
  }),

  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

// Validates environment variables at startup.
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