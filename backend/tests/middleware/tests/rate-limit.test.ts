import { testMiddleware } from '../testMiddleware';
import { rateLimit } from '../../middleware/rate-limit';
import { testRedis } from '../../setup/setup';

describe('Rate Limit Middleware', () => {
  beforeEach(async () => {
    await testRedis.clear();  // Clean rate limit counts
  });

  it('allows first request', async () => {
    const { next } = await testMiddleware.execute(
      rateLimit,
      testMiddleware.req({
        ip: '127.0.0.1',
        path: '/api/test'
      })
    );

    expect(next).toHaveBeenCalled();
  });

  it('blocks excessive requests', async () => {
    const ip = '127.0.0.1';
    const path = '/api/test';

    // Make multiple requests
    for (let i = 0; i < 5; i++) {
      await testMiddleware.execute(
        rateLimit,
        testMiddleware.req({ ip, path })
      );
    }

    // This one should be blocked
    const { res, next } = await testMiddleware.execute(
      rateLimit,
      testMiddleware.req({ ip, path })
    );

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Too many requests',
      retryAfter: expect.any(Number)
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('resets limit after window', async () => {
    const ip = '127.0.0.1';
    const path = '/api/test';

    // Hit the limit
    for (let i = 0; i < 5; i++) {
      await testMiddleware.execute(
        rateLimit,
        testMiddleware.req({ ip, path })
      );
    }

    // Wait for window to reset
    await new Promise(r => setTimeout(r, 1100));  // 1.1s window

    // Should work again
    const { next } = await testMiddleware.execute(
      rateLimit,
      testMiddleware.req({ ip, path })
    );

    expect(next).toHaveBeenCalled();
  });

  it('tracks limits per IP', async () => {
    // First IP hits limit
    for (let i = 0; i < 5; i++) {
      await testMiddleware.execute(
        rateLimit,
        testMiddleware.req({ 
          ip: '127.0.0.1', 
          path: '/api/test' 
        })
      );
    }

    // Different IP should still work
    const { next } = await testMiddleware.execute(
      rateLimit,
      testMiddleware.req({ 
        ip: '127.0.0.2', 
        path: '/api/test' 
      })
    );

    expect(next).toHaveBeenCalled();
  });

  it('includes remaining requests in headers', async () => {
    const { res } = await testMiddleware.execute(
      rateLimit,
      testMiddleware.req({
        ip: '127.0.0.1',
        path: '/api/test'
      })
    );

    expect(res.set).toHaveBeenCalledWith({
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': '4',
      'X-RateLimit-Reset': expect.any(Number)
    });
  });
});
