import { z } from 'zod';

// Environment schema for logger configuration
const loggerEnvSchema = z.object({
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  OTEL_SERVICE_NAME: z.string().default('Brandveri'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318'),
  OTEL_SERVICE_NAMESPACE: z.string().default('Brandveri'),
  OTEL_ENVIRONMENT: z.string().default('development'),
  JAEGER_AGENT_HOST: z.string().default('localhost'),
  JAEGER_AGENT_PORT: z.string().default('6831'),
  JAEGER_COLLECTOR_ENDPOINT: z.string().default('http://jaeger:14250'),
  LOKI_HOST: z.string().default('loki'),
  LOKI_PORT: z.string().default('3100'),
  LOKI_APP_LABEL: z.string().default('Brandveri'),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),
  LOG_FILE_MAX_SIZE: z.string().default('10M'),
  PROMETHEUS_NAMESPACE: z.string().default('Brandveri'),
  PROMETHEUS_PORT: z.string().default('8889')
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