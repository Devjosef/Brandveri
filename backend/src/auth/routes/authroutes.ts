import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { authenticateToken } from '../../../middleware/auth';
import rateLimiter from '../../../middleware/ratelimiter';
import { validateRegistration } from '../../../middleware/validator';
import redis from '../../../cache/redis';

const router = express.Router();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

const failedLoginAttempts = new Map();
const refreshTokens = new Set(); // Store refresh tokens

// Register route (public)
router.post('/register', validateRegistration, async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login route (public)
router.post('/login', rateLimiter, async (req, res) => {
  const { username, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const attempts = await redis.incr(`failedLogin:${username}`);
      if (attempts === 1) {
        await redis.expire(`failedLogin:${username}`, 60 * 15); // 15 minutes
      }

      if (attempts >= 5) {
        return res.status(403).json({ error: 'Account locked due to too many failed login attempts' });
      }

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await redis.del(`failedLogin:${username}`);

    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ username: user.username }, process.env.JWT_REFRESH_SECRET);

    refreshTokens.add(refreshToken);

    res.cookie('token', token, { httpOnly: true, secure: true });
    res.json({ message: 'Logged in successfully', refreshToken });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Failed to log in user' });
  }
});

// Refresh token route
router.post('/token', (req, res) => {
  const { token } = req.body;
  if (!token || !refreshTokens.has(token)) {
    return res.status(403).json({ error: 'Refresh token not found, login again' });
  }

  jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    const newToken = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ token: newToken });
  });
});

// Example of a protected route
router.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route' });
});

export default router;