import { testMiddleware } from '../testMiddleware';
import { authMiddleware } from '../../../middleware/auth';

describe('Auth Middleware', () => {
  it('allows valid token', async () => {
    const { req, next } = await testMiddleware.execute(
      authMiddleware,
      testMiddleware.req({
        headers: { authorization: 'Bearer valid.test.token' }
      })
    );

    expect(next).toHaveBeenCalled();
    expect(req['user']).toEqual({
      id: 'user123',
      role: 'user'
    });
  });

  it('blocks invalid token', async () => {
    const { res, next } = await testMiddleware.execute(
      authMiddleware,
      testMiddleware.req({
        headers: { authorization: 'Bearer invalid' }
      })
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // MISSING CRITICAL CASES
  it('handles missing token', async () => {
    const { res, next } = await testMiddleware.execute(
      authMiddleware,
      testMiddleware.req()  // No headers
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No token provided'
    });
  });

  it('handles malformed token', async () => {
    const { res } = await testMiddleware.execute(
      authMiddleware,
      testMiddleware.req({
        headers: { authorization: 'NotBearer token' }
      })
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid token format'
    });
  });

  it('handles expired token', async () => {
    const { res } = await testMiddleware.execute(
      authMiddleware,
      testMiddleware.req({
        headers: { authorization: 'Bearer expired.test.token' }
      })
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token expired'
    });
  });

  it('preserves existing user data', async () => {
    const { req, next } = await testMiddleware.execute(
      authMiddleware,
      testMiddleware.req({
        headers: { authorization: 'Bearer valid.test.token' },
        user: { existingData: true }  // Should preserve
      })
    );

    expect(next).toHaveBeenCalled();
    expect(req['user']).toEqual({
      id: 'user123',
      role: 'user',
      existingData: true  // Should exist
    });
  });
});