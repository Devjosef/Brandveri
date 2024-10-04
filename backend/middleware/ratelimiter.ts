import rateLimit from 'express-rate-limit';

const rateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // Default to 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 100, // Default to 100 requests per windowMs
  message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again later.',
});

export default rateLimiter;