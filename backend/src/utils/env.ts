import { z } from 'zod';

// Shared validation patterns
const commonValidation = {
  apiUrl: z.string().url(),
  apiKey: z.string().min(32, 'API key must be at least 32 characters'),
};

// Service-specific environment schemas
const serviceEnvSchemas = {
  trademark: z.object({
    USPTO_API_URL: commonValidation.apiUrl,
    USPTO_API_KEY: commonValidation.apiKey,
    EUIPO_API_URL: commonValidation.apiUrl,
    EUIPO_API_KEY: commonValidation.apiKey,
  }),

  copyright: z.object({
    COPYRIGHT_API_URL: commonValidation.apiUrl,
    COPYRIGHT_API_KEY: commonValidation.apiKey,
    COPYRIGHT_SEARCH_TIMEOUT: z.number().min(1000).max(10000).default(5000),
  }),

  payment: z.object({
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    PAYMENT_GATEWAY_URL: commonValidation.apiUrl,
    PAYMENT_TIMEOUT_MS: z.number().min(3000).max(15000).default(10000),
  }),

  recommendation: z.object({
    ML_API_URL: commonValidation.apiUrl,
    ML_API_KEY: commonValidation.apiKey,
    MODEL_VERSION: z.string().regex(/^\d+\.\d+\.\d+$/),
    INFERENCE_TIMEOUT: z.number().min(100).max(5000).default(1000),
  })
};

// Infrastructure configuration
const infrastructureSchema = z.object({
  // Core settings
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_URL: commonValidation.apiUrl,
  PORT: z.number().min(1).max(65535).default(3000),
  
  // Cache configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.number().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  CACHE_TTL: z.number().min(60).max(86400).default(3600),
  
  // Security
  JWT_SECRET: z.string().min(32),
  ALLOWED_ORIGINS: z.string().transform(str => str.split(',')),
  CSP_REPORT_URI: z.string().url().optional(),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.number().min(1000).default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.number().min(1).default(100),
  
  // Monitoring
  METRICS_ENABLED: z.boolean().default(true),
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Complete environment schema
const envSchema = z.object({
  ...infrastructureSchema.shape,
  ...serviceEnvSchemas.trademark.shape,
  ...serviceEnvSchemas.copyright.shape,
  ...serviceEnvSchemas.payment.shape,
  ...serviceEnvSchemas.recommendation.shape,
}).strict();

// Type for validated environment
type EnvConfig = z.infer<typeof envSchema>;

// Validate environment variables at startup
const validateEnv = (): EnvConfig => {
  try {
    const config = envSchema.parse(process.env);
    return Object.freeze(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('Unexpected error during environment validation:', error);
    }
    process.exit(1);
  }
};

// Export frozen environment configuration
export const env = validateEnv();

// Export service-specific configurations for type safety
export const serviceConfig = {
  trademark: {
    uspto: {
      url: env.USPTO_API_URL,
      key: env.USPTO_API_KEY,
    },
    euipo: {
      url: env.EUIPO_API_URL,
      key: env.EUIPO_API_KEY,
    },
  },
  copyright: {
    api: {
      url: env.COPYRIGHT_API_URL,
      key: env.COPYRIGHT_API_KEY,
      timeout: env.COPYRIGHT_SEARCH_TIMEOUT,
    },
  },
  payment: {
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    },
    gateway: {
      url: env.PAYMENT_GATEWAY_URL,
      timeout: env.PAYMENT_TIMEOUT_MS,
    },
  },
  recommendation: {
    ml: {
      url: env.ML_API_URL,
      key: env.ML_API_KEY,
      modelVersion: env.MODEL_VERSION,
      timeout: env.INFERENCE_TIMEOUT,
    },
  },
} as const;