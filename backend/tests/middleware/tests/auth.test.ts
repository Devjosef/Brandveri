import { authenticateToken } from '../../../middleware/auth';
import { testMiddleware } from '../testMiddleware';
import { TokenService } from '../../../auth/services/tokenService';
import jwt from 'jsonwebtoken';
import { Config } from '../../../middleware';

// Mock TokenService
jest.mock('../../../auth/services/tokenService');

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows valid token', async () => {
    const mockUser = { id: 'user123', tokenVersion: 1 };
    const token = jwt.sign(mockUser, Config.JWT_SECRET);
    
    // Mock token validation
    (TokenService.isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
    (TokenService.getTokenVersion as jest.Mock).mockResolvedValue(1);

    const { req, next } = await testMiddleware.execute(
      authenticateToken,
      testMiddleware.req({
        headers: { authorization: `Bearer ${token}` }
      })
    );

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject(mockUser);
  });

  it('blocks invalid token', async () => {
    const { res } = await testMiddleware.execute(
      authenticateToken,
      testMiddleware.req({
        headers: { authorization: 'Bearer invalid' }
      })
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Invalid token'
    });
  });

  it('handles missing token', async () => {
    const { res } = await testMiddleware.execute(
      authenticateToken,
      testMiddleware.req()
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      code: 'TOKEN_MISSING',
      message: 'Access denied. No token provided.'
    });
  });

  it('handles blacklisted token', async () => {
    const token = jwt.sign({ id: 'user123', tokenVersion: 1 }, Config.JWT_SECRET);
    (TokenService.isTokenBlacklisted as jest.Mock).mockResolvedValue(true);

    const { res } = await testMiddleware.execute(
      authenticateToken,
      testMiddleware.req({
        headers: { authorization: `Bearer ${token}` }
      })
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Token has been revoked'
    });
  });

  it('handles token version mismatch', async () => {
    const token = jwt.sign({ id: 'user123', tokenVersion: 1 }, Config.JWT_SECRET);
    (TokenService.isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
    (TokenService.getTokenVersion as jest.Mock).mockResolvedValue(2); // Different version

    const { res } = await testMiddleware.execute(
      authenticateToken,
      testMiddleware.req({
        headers: { authorization: `Bearer ${token}` }
      })
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Token version mismatch'
    });
  });
});