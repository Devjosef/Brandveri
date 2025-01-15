import { Router } from 'express';
import { register, login, refreshToken, logout } from '../controllers/authController';
import { validateRegistration, validateLogin } from '../../middleware/validator';
import { authRateLimiter, sensitiveOpsLimiter } from '../../middleware/ratelimiter';
import { authenticateToken } from '../../middleware/auth';
import { RequestHandler } from 'express';

const router = Router();

// Public authentication endpoints
router.post('/register', 
  sensitiveOpsLimiter,
  validateRegistration, 
  register as RequestHandler
);

router.post('/login', 
  authRateLimiter,
  validateLogin, 
  login as RequestHandler
);

router.post('/refresh-token', 
  authRateLimiter, 
  refreshToken as RequestHandler
);

// Handle logout with proper typing
router.post('/logout', 
  authenticateToken,
  authRateLimiter,
  logout as unknown as RequestHandler
);

export default router;

