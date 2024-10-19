import jwt, { JwtPayload, VerifyErrors } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: string | JwtPayload; // User can be either a string (if using simple JWT payloads) or JwtPayload
}

// JWT Authentication middleware
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Response<any> | void {
  const authHeader = req.headers['authorization']; // Get authorization header
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null; // Extract the token

  // If no token is provided, return a 401 Unauthorized response
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET as string, (err: VerifyErrors | null, user: JwtPayload | string | undefined) => {
    if (err) {
      // Handle specific case of token expiration
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired, please re-authenticate.' });
      }
      // Handle any other token verification errors
      return res.status(403).json({ error: 'Invalid token' });
    }

    // If the token is valid and the user is authenticated, attach the user to the request
    if (user) {
      req.user = user; // Assign the user to the request
      return next(); // Call the next middleware function
    } else {
      // Return a 403 Forbidden response if the token is invalid
      return res.status(403).json({ error: 'Invalid token' });
    }
  });

  // Explicitly return undefined 
  return;
}
