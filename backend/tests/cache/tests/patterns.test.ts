import { testRedis } from '../redis';

describe('Redis Cache Patterns', () => {
  beforeEach(async () => {
    await testRedis.clear();
  });

  it('handles pub/sub messaging', async () => {
    const subscriber = testRedis.client.duplicate();
    const messages: string[] = [];

    await subscriber.subscribe('test-channel');
    subscriber.on('message', (_, message) => messages.push(message));

    await testRedis.client.publish('test-channel', 'test message');
    await new Promise(r => setTimeout(r, 100));

    expect(messages).toEqual(['test message']);
    await subscriber.quit();
  });

  it('handles sorted sets', async () => {
    await testRedis.client.zadd('leaderboard', 100, 'user1', 200, 'user2');
    const scores = await testRedis.client.zrange('leaderboard', 0, -1, 'WITHSCORES');
    expect(scores).toEqual(['user1', '100', 'user2', '200']);
  });

  it('handles rate limiting pattern', async () => {
    const key = 'rate:127.0.0.1';
    await testRedis.client.incr(key);
    await testRedis.client.expire(key, 1);
    
    const count = await testRedis.client.get(key);
    expect(count).toBe('1');

    await new Promise(r => setTimeout(r, 1100));
    const expired = await testRedis.client.get(key);
    expect(expired).toBeNull();
  });
});