import { rootLogger } from './rootLogger';
import { LRUCache } from 'lru-cache';
import pino from 'pino';

interface LoggerOptions {
  context: string;
  metadata?: Record<string, unknown>;
}

interface CacheOptions {
  max: number;
  ttl: number;
  updateAgeOnGet: boolean;
}

class LoggerRegistry {
  private static readonly CACHE_SIZE = 1000;
  private static readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

  private loggerCache: LRUCache<string, pino.Logger>;

  constructor() {
    const cacheOptions: CacheOptions = {
      max: LoggerRegistry.CACHE_SIZE,
      ttl: LoggerRegistry.CACHE_TTL,
      updateAgeOnGet: true
    };

    this.loggerCache = new LRUCache<string, pino.Logger>(cacheOptions);
  }

  public getLogger(options: LoggerOptions): pino.Logger {
    const key = this.createCacheKey(options);
    const existingLogger = this.loggerCache.get(key);

    if (existingLogger) {
      return existingLogger;
    }

    const newLogger = rootLogger.child({
      context: options.context,
      ...options.metadata
    });
    
    this.loggerCache.set(key, newLogger);
    return newLogger;
  }

  private createCacheKey(options: LoggerOptions): string {
    return `${options.context}:${JSON.stringify(options.metadata || {})}`;
  }
}

export const loggerRegistry = new LoggerRegistry();

export const loggers = {
  trademark: loggerRegistry.getLogger({ context: 'trademark' }),
  copyright: loggerRegistry.getLogger({ context: 'copyright' }),
  auth: loggerRegistry.getLogger({ context: 'auth' }),
  cache: loggerRegistry.getLogger({ context: 'cache' }),
  database: loggerRegistry.getLogger({ context: 'database' }),
  api: loggerRegistry.getLogger({ context: 'api' }),
  payment: loggerRegistry.getLogger({ context: 'payment' }),
  recommendation: loggerRegistry.getLogger({ context: 'recommendation' }),
  system: loggerRegistry.getLogger({ 
    context: 'system',
    metadata: { 
      type: 'system',
      component: 'core'
    }
  }),
  invariant: loggerRegistry.getLogger({ 
    context: 'invariant',
    metadata: { 
      type: 'verification',
      component: 'assertions'
    }
  }),
  metrics: loggerRegistry.getLogger({ 
    context: 'metrics',
    metadata: { 
      type: 'monitoring',
      component: 'prometheus'
    }
  }),
  validation: loggerRegistry.getLogger({ 
    context: 'validation',
    metadata: { 
      type: 'data',
      component: 'schema'
    }
  })
} as const;

export type LogContext = keyof typeof loggers;