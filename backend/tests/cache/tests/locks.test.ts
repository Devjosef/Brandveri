import { testRedis, cachePatterns } from '../index';
import { loggers } from '../../../observability/contextLoggers';

const logger = loggers.test;

describe('Redis Locks', () => {
  beforeEach(async () => {
    try {
      await testRedis.clear();
    } catch (error) {
      logger.error({ error }, 'Failed to clear Redis');
      throw error;
    }
  });

  it('handles distributed locks', async () => {
    const lockKey = 'resource1';
    
    // First lock should succeed.
    const acquired = await cachePatterns.createLock(lockKey);
    expect(acquired).toBe('OK');

    // Second lock should fail.
    const failed = await cachePatterns.createLock(lockKey);
    expect(failed).toBeNull();
  });

  it('handles lock expiration', async () => {
    const lockKey = 'resource2';
    
    // Create lock with 1 second TTL.
    await testRedis.client.set(
      `lock:${lockKey}`,
      'locked',
      'EX',
      1,
      'NX'
    );
    
    // Wait for expiration.
    await new Promise(r => setTimeout(r, 1100));
    
    // Lock should be gone.
    const expired = await testRedis.client.get(`lock:${lockKey}`);
    expect(expired).toBeNull();
  });

  it('handles lock release', async () => {
    const lockKey = 'resource3';
    
    // Acquire lock.
    await cachePatterns.createLock(lockKey);
    
    // Release lock.
    await testRedis.client.del(`lock:${lockKey}`);
    
    // Should be able to acquire again.
    const reacquired = await cachePatterns.createLock(lockKey);
    expect(reacquired).toBe('OK');
  });

  it('handles concurrent lock attempts', async () => {
    const lockKey = 'resource4';
    
    // Try to acquire the same lock concurrently.
    const results = await Promise.all([
      cachePatterns.createLock(lockKey),
      cachePatterns.createLock(lockKey),
      cachePatterns.createLock(lockKey)
    ]);

    // Only one should succeed
    const successes = results.filter(result => result === 'OK');
    expect(successes).toHaveLength(1);
  });

  afterAll(async () => {
    try {
      await testRedis.close();
    } catch (error) {
      logger.error({ error }, 'Failed to close Redis');
      throw error;
    }
  });
});