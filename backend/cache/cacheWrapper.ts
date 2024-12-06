import { Redis, RedisOptions, Cluster } from 'ioredis';
import redisClient from './redis';
import redisCluster from './redisCluster';
import { createMetricsCollector, MetricsCollector } from '../cache/metrics';

// First, define the service type
export type CacheServiceName = 'trademark' | 'payment' | 'copyright' | 'recommendation';

interface CacheOptions extends Partial<RedisOptions> {
  ttl?: number;
  useCluster?: boolean;
  retries?: number;
  retryDelay?: number;
  service?: CacheServiceName;
}

export class CacheError extends Error {
  constructor(
    message: string, 
    public readonly operation: string,
    public readonly code: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CacheError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Wrapper for Redis cache operations with metrics collection and error handling
 */
class CacheWrapper {
  private readonly metrics: MetricsCollector;
  private readonly client: Redis | Cluster;

  constructor() {
    this.metrics = createMetricsCollector();
    this.client = redisClient;
  }

  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new CacheError('Invalid cache key', 'validation', 'INVALID_KEY');
    }
  }

  private validateValue(value: unknown): void {
    if (value === undefined) {
      throw new CacheError('Cannot cache undefined value', 'validation', 'UNDEFINED_VALUE');
    }
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const retries = options?.retries ?? 3;
    const delay = options?.retryDelay ?? 100;

    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(
          operation, 
          { ...options, retries: retries - 1, retryDelay: delay * 2 }
        );
      }
      throw error;
    }
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    this.validateKey(key);
    const client = options?.useCluster ? redisCluster : this.client;
    const startTime = Date.now();
    
    try {
      const value = await this.withRetry(() => client.get(key), options);
      this.metrics.observeLatency('get', Date.now() - startTime);
      this.metrics.recordOperation('get', 'success');
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.metrics.recordOperation('get', 'error');
      throw new CacheError(
        error instanceof Error ? error.message : 'Unknown cache error',
        'get',
        'CACHE_ERROR',
        { key }
      );
    }
  }

  async set(key: string, value: unknown, options?: CacheOptions): Promise<void> {
    this.validateKey(key);
    this.validateValue(value);
    const client = options?.useCluster ? redisCluster : this.client;
    const startTime = Date.now();
    
    try {
      const serializedValue = JSON.stringify(value);
      await this.withRetry(async () => {
        if (options?.ttl) {
          await client.set(key, serializedValue, 'EX', options.ttl);
        } else {
          await client.set(key, serializedValue);
        }
      }, options);
      
      this.metrics.observeLatency('set', Date.now() - startTime);
      this.metrics.recordOperation('set', 'success');
    } catch (error) {
      this.metrics.recordOperation('set', 'error');
      throw new CacheError(
        error instanceof Error ? error.message : 'Unknown cache error',
        'set',
        'CACHE_ERROR',
        { key, value }
      );
    }
  }

  async del(key: string, options?: CacheOptions): Promise<void> {
    this.validateKey(key);
    const client = options?.useCluster ? redisCluster : this.client;
    const startTime = Date.now();
    
    try {
      await this.withRetry(() => client.del(key), options);
      this.metrics.observeLatency('del', Date.now() - startTime);
      this.metrics.recordOperation('del', 'success');
    } catch (error) {
      this.metrics.recordOperation('del', 'error');
      throw new CacheError(
        error instanceof Error ? error.message : 'Unknown cache error',
        'del',
        'CACHE_ERROR',
        { key }
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    const startTime = Date.now();
    try {
      await this.set('health_check', 'ok', { ttl: 1 });
      await this.get('health_check');
      this.metrics.observeLatency('ping', Date.now() - startTime);
      this.metrics.recordOperation('ping', 'success');
      return true;
    } catch (error) {
      this.metrics.recordOperation('ping', 'error');
      return false;
    }
  }

  pipeline() {
    return this.client.pipeline();
  }

  async executePipeline(operations: Array<() => void>): Promise<void> {
    const pipeline = this.client.pipeline();
    operations.forEach(op => op());
    await pipeline.exec();
  }
}

export const cacheWrapper = new CacheWrapper();