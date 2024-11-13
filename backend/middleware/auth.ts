import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { TokenPayload } from '../auth/utils/tokenUtils';
import { TokenService } from '../auth/services/tokenService';
import { AuthError, AuthErrorTypes } from '../auth/utils/AuthError';
import { Counter } from 'prom-client';
import { Config } from './index'

export interface AuthenticatedRequest extends Request {
  user: TokenPayload;
}

// Authentication metrics
const authMetrics = {
  attempts: new Counter({
    name: 'auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['status']
  }),
  tokenValidations: new Counter({
    name: 'token_validations_total',
    help: 'Total number of token validations',
    labelNames: ['status']
  })
};

export const authenticateToken: RequestHandler<
  never,
  { status: string; code: string; message: string }
> = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  authMetrics.attempts.inc({ status: 'attempt' });
  
  const authHeader = req.header('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    authMetrics.attempts.inc({ status: 'missing_token' });
    res.status(401).json({
      status: 'error',
      code: 'TOKEN_MISSING',
      message: 'Access denied. No token provided.'
    });
    return;
  }

  try {
    authMetrics.tokenValidations.inc({ status: 'attempt' });
    
    const isBlacklisted = await TokenService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      authMetrics.tokenValidations.inc({ status: 'blacklisted' });
      throw new AuthError(401, 'Token has been revoked', AuthErrorTypes.INVALID_TOKEN);
    }

    const user = jwt.verify(token, Config.JWT_SECRET) as TokenPayload;
    const currentTokenVersion = await TokenService.getTokenVersion(user.id);
    
    if (user.tokenVersion !== currentTokenVersion) {
      authMetrics.tokenValidations.inc({ status: 'version_mismatch' });
      throw new AuthError(401, 'Token version mismatch', AuthErrorTypes.INVALID_TOKEN);
    }

    authMetrics.tokenValidations.inc({ status: 'success' });
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      authMetrics.attempts.inc({ status: 'auth_error' });
      res.status(err.statusCode).json({
        status: 'error',
        code: err.code,
        message: err.message
      });
      return;
    }
    if (err instanceof jwt.TokenExpiredError) {
      authMetrics.attempts.inc({ status: 'token_expired' });
      res.status(401).json({ 
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'Token expired, please re-authenticate.'
      });
      return;
    }
    authMetrics.attempts.inc({ status: 'invalid_token' });
    res.status(403).json({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Invalid token'
    });
    return;
  }
};

