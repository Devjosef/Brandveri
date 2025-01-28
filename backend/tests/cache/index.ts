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

// Comprehensive cleanup
export const cleanup = {
  async all() {
    await testRedis.clear();
    await testRedis.client.script('FLUSH');
  },
  async keys(pattern: string) {
    const keys = await testRedis.client.keys(pattern);
    if (keys.length) {
      await testRedis.client.del(...keys);
    }
  },
  async subscribers() {
    const clients = (await testRedis.client.client('LIST')) as string;
    const clientList = clients.split('\n').filter(Boolean);
    
    // Close all subscriber connections
    for (const client of clientList) {
      if (client.includes('flags=S')) {
        const id = client.match(/id=(\d+)/)?.[1];
        if (id) {
          await testRedis.client.client('KILL', `id ${id}`);
        }
      }
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
