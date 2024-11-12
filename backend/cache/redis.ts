import Redis from 'ioredis';
import dotenv from 'dotenv';
import { createMetricsCollector } from './metrics';
import CircuitBreaker from 'opossum';

dotenv.config();

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: {};
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  keepAlive?: number;
  connectTimeout?: number;
  retryStrategy?: (times: number) => number | void | null;
  reconnectOnError?: (err: Error) => boolean;
}

const DEFAULT_CONFIG: RedisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  keepAlive: 5000,
  connectTimeout: 10000
};

const metricsCollector = createMetricsCollector();

// Enhanced reconnection strategy
const RECONNECTION_CONFIG = {
  maxRetries: 10,
  baseDelay: 1000,
  maxDelay: 30000
};

function createRetryStrategy() {
  let retryCount = 0;
  
  return (_times: number): number | void | null => {
    if (retryCount >= RECONNECTION_CONFIG.maxRetries) {
      console.error(`Max retries (${RECONNECTION_CONFIG.maxRetries}) reached, stopping reconnection attempts`);
      return null;
    }

    retryCount++;
    const delay = Math.min(
      RECONNECTION_CONFIG.baseDelay * Math.pow(2, retryCount - 1),
      RECONNECTION_CONFIG.maxDelay
    );

    console.log(`Retry attempt ${retryCount}, waiting ${delay}ms`);
    metricsCollector.recordOperation('ping', 'error');
    return delay;
  };
}


const redisConfig: RedisConfig = {
  ...DEFAULT_CONFIG,
  retryStrategy: createRetryStrategy(),
  reconnectOnError: (err: { message: string | string[]; }) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
};

// Circuit breaker for Redis operations
const breaker = new CircuitBreaker(
  async (operation: () => Promise<any>) => operation(),
  {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000
  }
);

const redisClient = new Redis(redisConfig);

// Wrap Redis operations with circuit breaker
const protectedRedisClient = new Proxy(redisClient, {
  get(target: Redis, prop: string | symbol) {
    const original = target[prop as keyof Redis];
    if (typeof original === 'function') {
      return (...args: unknown[]) => breaker.fire(() => (original as Function).apply(target, args));
    }
    return original;
  }
});

// Enhanced event handlers
breaker.on('open', () => {
  console.error('Circuit breaker opened - Redis connection is failing');
  metricsCollector.recordOperation('ping', 'error');
});

breaker.on('close', () => {
  console.log('Circuit breaker closed - Redis connection restored');
  metricsCollector.recordOperation('ping', 'success');
});

// Existing event handlers
redisClient.on('connect', () => {
  console.log('Redis client connected');
  metricsCollector.recordOperation('ping', 'success');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
  metricsCollector.recordOperation('ping', 'error');
});

// Enhanced shutdown handler
async function gracefulShutdown() {
  console.log('Initiating graceful shutdown...');
  try {
    await breaker.shutdown();
    await redisClient.quit();
    console.log('Redis connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default protectedRedisClient;