import { testMiddleware } from '../testMiddleware';
import { sensitiveOpsLimiter, __testing__ } from '../../../middleware/ratelimiter';

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    __testing__.clearStore();
  });

  it('allows requests within limit', async () => {
    const { next } = await testMiddleware.execute(
      sensitiveOpsLimiter,
      testMiddleware.req({
        ip: '127.0.0.1'
      })
    );

    expect(next).toHaveBeenCalled();
  });

  it('blocks excessive requests', async () => {
    const ip = '127.0.0.1';
    
    // Make requests up to the limit
    for (let i = 0; i < Config.SENSITIVE_RATE_LIMIT_MAX; i++) {
      await testMiddleware.execute(
        sensitiveOpsLimiter,
        testMiddleware.req({ ip })
      );
    }

    // This one should be blocked
    const { res } = await testMiddleware.execute(
      sensitiveOpsLimiter,
      testMiddleware.req({ ip })
    );

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later'
    });
  });
});
