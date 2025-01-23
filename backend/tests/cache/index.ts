import { testRedis } from './redis';

// Exports everything needed for cache tests
export {
  testRedis,
};

// Export common test patterns.
export const cachePatterns = {
  /**
   * Creates a distributed lock
   */
  async createLock(key: string, ttl = 10) {
    return testRedis.client.set(
      `lock:${key}`,
      'locked',
      'EX',
      ttl,
      'NX'
    );
  },

  /**
   * Creates a rate limit entry.
   */
  async createRateLimit(ip: string, _limit = 10) {
    const key = `rate:${ip}`;
    const multi = testRedis.client.multi();
    multi.incr(key);
    multi.expire(key, 60);
    return multi.exec();
  },

  /**
   * Creates a leaderboard entry.
   */
  async setLeaderboardScore(userId: string, score: number) {
    return testRedis.client.zadd('leaderboard', score, userId);
  },

  /**
   * Create a pub/sub channel.
   */
  async createSubscriber(channel: string) {
    const subscriber = testRedis.client.duplicate();
    await subscriber.subscribe(channel);
    return subscriber;
  }
};

// Export test cleanup utilities.
export const cleanup = {
  /**
   * Clears all test data
   */
  async all() {
    await testRedis.clear();
  },

  /**
   * Clears specific patterns.
   */
  async pattern(pattern: string) {
    const keys = await testRedis.client.keys(pattern);
    if (keys.length) {
      await testRedis.client.del(...keys);
    }
  }
};

// Export common test data.
export const testData = {
  users: ['user1', 'user2', 'user3'],
  scores: [100, 200, 300],
  channels: ['test-channel', 'notifications'],
  patterns: ['cache:*', 'lock:*', 'rate:*']
};
