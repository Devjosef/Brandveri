import { Router } from 'express';
import { register, login, refreshToken, logout } from '../controllers/authController';

const router = Router();

// Route for user registration
router.post('/register', register);

// Route for user login
router.post('/login', login);

// Route for refreshing access tokens
router.post('/refresh-token', refreshToken);

// Route for logging out
router.post('/logout', logout);

export default router;

