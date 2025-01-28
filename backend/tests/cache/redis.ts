import Redis from 'ioredis';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

interface RedisConfig {
  host: string;
  port: number;
  db: number;
  maxRetriesPerRequest: number;
  connectTimeout: number;
  retryStrategy?: (times: number) => number | null;
}

const config: RedisConfig = {
  host: process.env.TEST_REDIS_HOST || 'localhost',
  port: Number(process.env.TEST_REDIS_PORT) || 6379,
  db: Number(process.env.TEST_REDIS_DB) || 1,
  maxRetriesPerRequest: 1,
  connectTimeout: 1000,
  retryStrategy: (times) => Math.min(times * 50, 2000)
};

// Simple Redis test client.
export const testRedis = {
  client: new Redis(config),

  async set(key: string, value: unknown, ttl?: number) {
    const data = JSON.stringify(value);
    if (ttl) {
      await this.client.setex(key, ttl, data);
    } else {
      await this.client.set(key, data);
    }
    logger.debug({ key, ttl }, 'Cache set');
  },

  async get<T extends Record<string, unknown>>(
    key: string,
    validate?: (data: unknown) => data is T
  ): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    if (validate && !validate(parsed)) {
      throw new Error(`Invalid cache data for key: ${key}`);
    }
    return parsed;
  },

  async clear() {
    await this.client.flushdb();
    logger.debug('Cache cleared');
  },

  async close() {
    await this.client.quit();
  }
};

export class CacheError extends Error {
  constructor(
    public code: 'CONNECTION_ERROR' | 'COMMAND_ERROR' | 'VALIDATION_ERROR',
    message: string
  ) {
    super(message);
    this.name = 'CacheError';
  }
}