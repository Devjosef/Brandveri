import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Define specific limiters for different use cases
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => rateLimit({
  windowMs: options.windowMs || Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: options.max || Number(process.env.RATE_LIMIT_MAX) || 100,
  message: options.message || process.env.RATE_LIMIT_MESSAGE || 'Too many requests, please try again later.',
  keyGenerator: options.keyGenerator,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: options.message || process.env.RATE_LIMIT_MESSAGE || 'Too many requests, please try again later.'
    });
  }
});

// Default rate limiter for general API endpoints
export const defaultRateLimiter = createRateLimiter({});

// Stricter rate limiter for authentication endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  message: 'Too many authentication attempts, please try again later'
});

// Custom rate limiter for sensitive operations
export const sensitiveOpsLimiter = createRateLimiter({
  windowMs: Number(process.env.SENSITIVE_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000,
  max: Number(process.env.SENSITIVE_RATE_LIMIT_MAX) || 10,
  message: 'Too many sensitive operations attempted, please try again later'
});