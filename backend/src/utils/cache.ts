import { Redis } from 'ioredis';
import { Counter, Histogram } from 'prom-client';
import { env } from './env';

// Metrics for cache operations
const cacheMetrics = {
  operations: new Counter({
    name: 'cache_operations_total',
    help: 'Total number of cache operations',
    labelNames: ['operation', 'status', 'service']
  }),
  duration: new Histogram({
    name: 'cache_operation_duration_seconds',
    help: 'Duration of cache operations',
    labelNames: ['operation'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1]
  })
};

export class Cache {
  private readonly client: Redis;
  private readonly defaultTTL: number;

  constructor(config = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    defaultTTL: 3600 // 1 hour
  }) {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });

    this.defaultTTL = config.defaultTTL;
    this.setupErrorHandling();
  }

  async set<T>(key: string, value: T, options?: {
    ttl?: number;
    service?: string;
  }): Promise<void> {
    const timer = cacheMetrics.duration.startTimer({ operation: 'set' });
    const service = options?.service || 'unknown';

    try {
      const serializedValue = JSON.stringify(value);
      const ttl = options?.ttl || this.defaultTTL;

      await this.client.set(key, serializedValue, 'EX', ttl);

      cacheMetrics.operations.inc({
        operation: 'set',
        status: 'success',
        service
      });
    } catch (error) {
      cacheMetrics.operations.inc({
        operation: 'set',
        status: 'error',
        service
      });
      throw new CacheError('SET_ERROR', `Failed to set cache key: ${key}`, error);
    } finally {
      timer();
    }
  }

  async get<T>(key: string, options?: { service?: string }): Promise<T | null> {
    const timer = cacheMetrics.duration.startTimer({ operation: 'get' });
    const service = options?.service || 'unknown';

    try {
      const data = await this.client.get(key);
      
      cacheMetrics.operations.inc({
        operation: 'get',
        status: data ? 'hit' : 'miss',
        service
      });

      return data ? JSON.parse(data) : null;
    } catch (error) {
      cacheMetrics.operations.inc({
        operation: 'get',
        status: 'error',
        service
      });
      throw new CacheError('GET_ERROR', `Failed to get cache key: ${key}`, error);
    } finally {
      timer();
    }
  }

  async invalidate(key: string, options?: { service?: string }): Promise<void> {
    const timer = cacheMetrics.duration.startTimer({ operation: 'invalidate' });
    const service = options?.service || 'unknown';

    try {
      await this.client.del(key);
      cacheMetrics.operations.inc({
        operation: 'invalidate',
        status: 'success',
        service
      });
    } catch (error) {
      cacheMetrics.operations.inc({
        operation: 'invalidate',
        status: 'error',
        service
      });
      throw new CacheError('INVALIDATE_ERROR', `Failed to invalidate cache key: ${key}`, error);
    } finally {
      timer();
    }
  }

  private setupErrorHandling(): void {
    this.client.on('error', (error) => {
      console.error('Redis client error:', error);
      cacheMetrics.operations.inc({
        operation: 'connection',
        status: 'error',
        service: 'redis'
      });
    });

    this.client.on('connect', () => {
      cacheMetrics.operations.inc({
        operation: 'connection',
        status: 'success',
        service: 'redis'
      });
    });
  }
}

export class CacheError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'CacheError';
  }
}

// Export singleton instance
export const cacheService = new Cache();