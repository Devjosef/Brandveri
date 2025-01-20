import pino, { LoggerOptions } from 'pino';
import { z } from 'zod';
import { TransportChain } from '../observability/transportChain';
import { env } from './envlogger';

const transportSchema = z.object({
  target: z.string(),
  options: z.object({
    colorize: z.boolean().optional(),
    translateTime: z.string().optional(),
    ignore: z.string().optional()
  }).optional()
}).default({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname'
  }
});

const loggerOptionsSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),
  transport: transportSchema,
  formatters: z.record(z.any()).optional(),
  redact: z.object({
    paths: z.array(z.string()),
    remove: z.boolean()
  }).optional(),
  serializers: z.record(z.function()).optional()
});

interface LoggerConfigOptions {
  isDevelopment: boolean;
  pretty: boolean;
  includeDebug: boolean;
}

export class LoggerConfiguration {
  private static transportChain: TransportChain;
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) return;
    
    this.transportChain = new TransportChain();
    
    // Addition of Loki transport if configured
    if (env.LOKI_HOST && env.LOKI_PORT) {
      this.transportChain.addTransport('loki', {
        type: 'loki',
        priority: 1,
        options: {
          host: env.LOKI_HOST,
          port: env.LOKI_PORT,
          labels: { app: env.LOKI_APP_LABEL || 'brandveri' }
        }
      });
    }

    // Addition of File transport if configured
    const defaultLogPath = './logs/app.log';
    if (env.LOG_FILE_PATH || defaultLogPath) {
      this.transportChain.addTransport('file', {
        type: 'file',
        priority: 2,
        options: {
          path: env.LOG_FILE_PATH || defaultLogPath,
          rotate: true,
          maxSize: env.LOG_FILE_MAX_SIZE || '10M'
        }
      });
    }

    // Set fallback only if both transports exist
    if (env.LOKI_HOST && (env.LOG_FILE_PATH || defaultLogPath)) {
      this.transportChain.setFallback('loki', 'file');
    }

    this.isInitialized = true;
  }

  private static validateConfig(config: unknown): LoggerOptions {
    return loggerOptionsSchema.parse(config);
  }

  public static createConfig(options: LoggerConfigOptions): LoggerOptions {
    const baseConfig: LoggerOptions = {
      level: process.env.LOG_LEVEL?.split(',')[0]?.trim() as pino.LevelWithSilent || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      },
      formatters: {
        level: (label) => ({ level: label }),
        bindings: (bindings) => ({ 
          pid: bindings.pid, 
          host: bindings.hostname 
        })
      },
      redact: {
        paths: ['password', 'token', 'authorization', 'cookie'],
        remove: true
      },
      serializers: {
        err: (err) => ({
          type: err.constructor.name,
          message: err.message,
          stack: options.isDevelopment ? err.stack : undefined,
          code: err.code
        }),
        req: (req) => ({
          method: req.method,
          url: req.url,
          path: req.path,
          parameters: options.includeDebug ? req.params : undefined,
          requestId: req.id
        })
      }
    };

    return this.validateConfig(baseConfig);
  }
}