import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT.trim(), 10) : 6379;

const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: redisPort,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined, // Securing redis communication
  retryStrategy: (times) => {
    // Reconnect after
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('error', (err) => {
  console.error('Redis error: ', err);
});

export default redisClient;
