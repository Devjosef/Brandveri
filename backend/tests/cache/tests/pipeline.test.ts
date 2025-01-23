import { testRedis } from '../redis';

describe('Redis Pipeline', () => {
  beforeEach(async () => {
    await testRedis.clear();
  });

  it('handles pipeline operations', async () => {
    const pipeline = testRedis.client.pipeline();
    
    pipeline.set('key1', 'value1');
    pipeline.set('key2', 'value2');
    pipeline.get('key1');
    pipeline.get('key2');

    const results = await pipeline.exec();
    expect(results).toHaveLength(4);
    expect(results?.[2]?.[1]).toBe('value1');
    expect(results?.[3]?.[1]).toBe('value2');
  });

  it('handles pipeline errors', async () => {
    const pipeline = testRedis.client.pipeline();
    
    pipeline.set('key', 'value');
    pipeline.incr('key'); // Will fail - Cannot increment a string

    const results = await pipeline.exec();
    expect(results?.[0]?.[0]).toBeNull(); // First command succeeds,
    expect(results?.[1]?.[0]).toBeInstanceOf(Error); // Second fails.
  });
});