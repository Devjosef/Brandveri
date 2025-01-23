import Redis from 'ioredis';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

// Simple Redis test client.
export const testRedis = {
  client: new Redis({
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: Number(process.env.TEST_REDIS_PORT) || 6379,
    db: Number(process.env.TEST_REDIS_DB) || 1,
    maxRetriesPerRequest: 1,
    connectTimeout: 1000
  }),

  async set(key: string, value: unknown, ttl?: number) {
    const data = JSON.stringify(value);
    if (ttl) {
      await this.client.setex(key, ttl, data);
    } else {
      await this.client.set(key, data);
    }
    logger.debug({ key, ttl }, 'Cache set');
  },

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  },

  async clear() {
    await this.client.flushdb();
    logger.debug('Cache cleared');
  },

  async close() {
    await this.client.quit();
  }
};