import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { TokenPayload } from '../auth/utils/tokenUtils';
import { TokenService } from '../auth/services/tokenService';
import { AuthError, AuthErrorTypes } from '../auth/utils/AuthError';

export interface AuthenticatedRequest extends Request {
  user: TokenPayload;
}

export const authenticateToken: RequestHandler<
  never,
  { status: string; code?: string; message: string } | { error: string }
> = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.header('authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  try {
    const isBlacklisted = await TokenService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new AuthError(401, 'Token has been revoked', AuthErrorTypes.INVALID_TOKEN);
    }

    const user = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
    const currentTokenVersion = await TokenService.getTokenVersion(user.id);
    
    if (user.tokenVersion !== currentTokenVersion) {
      throw new AuthError(401, 'Token version mismatch', AuthErrorTypes.INVALID_TOKEN);
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({
        status: 'error',
        code: err.code,
        message: err.message
      });
      return;
    }
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'Token expired, please re-authenticate.'
      });
      return;
    }
    res.status(403).json({ error: 'Invalid token' });
    return;
  }
};

