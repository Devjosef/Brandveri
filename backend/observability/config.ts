import { LoggerOptions } from 'pino';
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
});

const loggerOptionsSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'trace']),
  transport: transportSchema.optional(),
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

  public static initialize(): void {
    this.transportChain = new TransportChain();
    
    // Addition of Loki transport
    this.transportChain.addTransport('loki', {
      type: 'loki',
      priority: 1,
      options: {
        host: env.LOKI_HOST,
        port: env.LOKI_PORT,
        labels: { app: env.LOKI_APP_LABEL }
      }
    });

    // Addition of File transport
    this.transportChain.addTransport('file', {
      type: 'file',
      priority: 2,
      options: {
        path: env.LOG_FILE_PATH,
        rotate: true,
        maxSize: env.LOG_FILE_MAX_SIZE
      }
    });

    // Set fallback
    this.transportChain.setFallback('loki', 'file');
  }

  private static validateConfig(config: unknown): LoggerOptions {
    return loggerOptionsSchema.parse(config);
  }

  public static createConfig(options: LoggerConfigOptions): LoggerOptions {
    const baseConfig: LoggerOptions = {
      level: options.includeDebug ? 'debug' : 'info',
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
      },
      transport: this.transportChain.getTransportConfig()
    };

    if (options.pretty) {
      return this.validateConfig({
        ...baseConfig,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
          }
        }
      });
    }

    return this.validateConfig(baseConfig);
  }
}