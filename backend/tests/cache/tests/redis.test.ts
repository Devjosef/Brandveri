import { testRedis } from './redis';

describe('Redis Cache', () => {
  beforeEach(async () => {
    await testRedis.clear();
  });

  it('handles basic cache operations', async () => {
    await testRedis.set('test:key', { data: 'value' });
    expect(await testRedis.get('test:key')).toEqual({ data: 'value' });
  });

  it('handles TTL correctly', async () => {
    await testRedis.set('test:ttl', 'data', 1);
    expect(await testRedis.client.ttl('test:ttl')).toBeGreaterThan(0);
    
    await new Promise(r => setTimeout(r, 1100));
    expect(await testRedis.get('test:ttl')).toBeNull();
  });

  it('handles concurrent operations', async () => {
    await Promise.all([
      testRedis.set('key1', 'value1'),
      testRedis.set('key2', 'value2'),
      testRedis.set('key3', 'value3')
    ]);

    const results = await Promise.all([
      testRedis.get('key1'),
      testRedis.get('key2'),
      testRedis.get('key3')
    ]);

    expect(results).toEqual(['value1', 'value2', 'value3']);
  });

  it('handles complex data structures', async () => {
    const complex = {
      array: [1, 2, { nested: true }],
      date: new Date().toISOString(),
      map: { key: 'value' }
    };

    await testRedis.set('test:complex', complex);
    expect(await testRedis.get('test:complex')).toEqual(complex);
  });

  it('handles cache misses gracefully', async () => {
    expect(await testRedis.get('nonexistent')).toBeNull();
  });

  afterAll(async () => {
    await testRedis.close();
  });
});