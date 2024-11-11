import { Router } from 'express';
import { register, login, refreshToken, logout } from '../controllers/authController';
import { validateRegistration, validateLogin } from '../../middleware/validator';
import { authRateLimiter, sensitiveOpsLimiter } from '../../middleware/ratelimiter';
import { authenticateToken } from '../../middleware/auth';


const router = Router();

// Public authentication endpoints
router.post('/register', 
  sensitiveOpsLimiter,
  validateRegistration, 
  register
);

router.post('/login', 
  authRateLimiter,
  validateLogin, 
  login
);

router.post('/refresh-token', 
  authRateLimiter, 
  refreshToken
);

router.post('/logout', 
  authenticateToken,
  authRateLimiter,
  logout
);

export default router;

