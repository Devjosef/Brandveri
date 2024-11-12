import { cacheWrapper } from './cacheWrapper';
import { createMetricsCollector } from './metrics';
import { CacheError } from './cacheWrapper';
import redisCluster from './redisCluster';
import redisClient from './redis';

const metricsCollector = createMetricsCollector();

interface TokenStorageOptions {
  ttl?: number;
  useCluster?: boolean;
}

class TokenStorage {
  private readonly prefix = 'bv:token:';
  private readonly blacklistPrefix = 'bv:blacklist:';
  private readonly maxTokensPerUser = 5;

  async storeRefreshToken(
    userId: string,
    refreshToken: string,
    expiresIn: number,
    options?: TokenStorageOptions
  ): Promise<void> {
    const userTokensKey = `${this.prefix}${userId}:tokens`;
    const startTime = Date.now();

    try {
      const client = options?.useCluster ? redisCluster : redisClient;
      const pipeline = client.pipeline();
      pipeline.lpush(userTokensKey, refreshToken);
      pipeline.ltrim(userTokensKey, 0, this.maxTokensPerUser - 1);
      pipeline.expire(userTokensKey, options?.ttl || expiresIn);
      
      await pipeline.exec();
      metricsCollector.observeLatency('set', Date.now() - startTime);
      metricsCollector.recordOperation('set', 'success');
    } catch (error) {
      metricsCollector.recordOperation('set', 'error');
      throw new CacheError('Failed to store refresh token', 'set', 'TOKEN_STORE_ERROR');
    }
  }

  async isRefreshTokenValid(
    userId: string, 
    refreshToken: string,
    options?: TokenStorageOptions
  ): Promise<boolean> {
    const startTime = Date.now();
    const client = options?.useCluster ? redisCluster : redisClient;

    try {
      const [isBlacklisted, tokens] = await Promise.all([
        client.get(`${this.blacklistPrefix}${refreshToken}`),
        client.lrange(`${this.prefix}${userId}:tokens`, 0, -1)
      ]);

      metricsCollector.observeLatency('get', Date.now() - startTime);
      metricsCollector.recordOperation('get', 'success');

      return !isBlacklisted && tokens.includes(refreshToken);
    } catch (error) {
      metricsCollector.recordOperation('get', 'error');
      throw new CacheError(
        'Failed to validate refresh token',
        'get',
        'TOKEN_VALIDATION_ERROR',
        { userId, refreshToken }
      );
    }
  }

  async invalidateRefreshToken(
    userId: string, 
    refreshToken: string, 
    expiresIn: number,
    options?: TokenStorageOptions
  ): Promise<void> {
    const startTime = Date.now();

    try {
      await Promise.all([
        cacheWrapper.del(`${this.prefix}${userId}`, options),
        cacheWrapper.set(
          `${this.blacklistPrefix}${refreshToken}`, 
          'true', 
          { ttl: expiresIn, useCluster: options?.useCluster }
        )
      ]);

      metricsCollector.observeLatency('del', Date.now() - startTime);
      metricsCollector.recordOperation('del', 'success');
    } catch (error) {
      metricsCollector.recordOperation('del', 'error');
      throw new Error('Failed to invalidate refresh token');
    }
  }
}

export const tokenStorage = new TokenStorage();
