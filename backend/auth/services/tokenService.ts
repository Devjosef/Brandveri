import { Redis } from 'ioredis';
import { AuthError, AuthErrorTypes } from '../utils/AuthError';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

export class TokenService {
  private static readonly REFRESH_TOKEN_PREFIX = 'refresh_token:';
  private static readonly BLACKLIST_PREFIX = 'blacklist:';
  private static readonly TOKEN_VERSION_PREFIX = 'token_version:';

  static async blacklistToken(token: string, expirationTime: number): Promise<void> {
    if (!token) {
      throw new AuthError(400, 'Token is required', AuthErrorTypes.MISSING_FIELDS);
    }
    await redis.setex(
      `${this.BLACKLIST_PREFIX}${token}`,
      expirationTime,
      'blacklisted'
    );
  }

  static async isTokenBlacklisted(token: string): Promise<boolean> {
    if (!token) return true;
    const result = await redis.get(`${this.BLACKLIST_PREFIX}${token}`);
    return result !== null;
  }

  static async revokeUserTokens(userId: number): Promise<void> {
    const pattern = `${this.REFRESH_TOKEN_PREFIX}${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  static async storeRefreshToken(
    userId: number,
    tokenFamily: string,
    token: string,
    expiresIn: number
  ): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${userId}:${tokenFamily}`;
    await redis.setex(key, expiresIn, token);
  }

  static async validateRefreshToken(
    userId: number,
    tokenFamily: string,
    token: string
  ): Promise<boolean> {
    const storedToken = await redis.get(
      `${this.REFRESH_TOKEN_PREFIX}${userId}:${tokenFamily}`
    );
    return storedToken === token;
  }

  static async incrementTokenVersion(userId: number): Promise<void> {
    const key = `${this.TOKEN_VERSION_PREFIX}${userId}`;
    await redis.incr(key);
  }

  static async getTokenVersion(userId: number): Promise<number> {
    const key = `${this.TOKEN_VERSION_PREFIX}${userId}`;
    const version = await redis.get(key);
    return version ? parseInt(version, 10) : 0;
  }
}