import { Request, Response } from 'express';
import rateLimit, { Store } from 'express-rate-limit';
import { Counter, Histogram } from 'prom-client';
import { LRUCache } from 'lru-cache';
import { Config } from './index';

// Metrics for rate limiting
const rateLimitMetrics = {
  exceeded: new Counter({
    name: 'rate_limit_exceeded_total',
    help: 'Total number of rate limit exceeded events',
    labelNames: ['limiter_type']
  }),
  hits: new Counter({
    name: 'rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['limiter_type']
  }),
  duration: new Histogram({
    name: 'rate_limit_operation_duration_seconds',
    help: 'Duration of rate limit operations',
    labelNames: ['operation']
  })
};

interface RateLimitStoreData {
  hits: number;
  resetTime: Date;
}

let isWarmedUp = false;

const sanitizeKey = (key: string): string => {
  return key.replace(/[^a-zA-Z0-9_-]/g, '');
};

const rateLimitStore = new LRUCache<string, RateLimitStoreData>({
  max: Config.RATE_LIMIT_MAX,
  ttl: Config.RATE_LIMIT_WINDOW_MS,
  updateAgeOnGet: true,
  updateAgeOnHas: true
});

/**
 * Custom rate limiting store implementation using LRU cache
 * @implements {Store}
 */
const customStore: Store = {
  /**
   * Initialize the store and warm it up
   */
  init: async function(): Promise<void> {
    if (!isWarmedUp) {
      try {
        // Warm up operations here if needed
        isWarmedUp = true;
      } catch (error) {
        console.error('Store initialization error:', error);
      }
    }
  },

  /**
   * Get rate limit info for a key
   * @param {string} key - The rate limit key
   * @returns {Promise<ClientRateLimitInfo | undefined>}
   */
  async get(key: string) {
    const timer = rateLimitMetrics.duration.startTimer({ operation: 'get' });
    try {
      const data = rateLimitStore.get(sanitizeKey(key));
      if (!data) return undefined;
      return {
        totalHits: data.hits,
        resetTime: data.resetTime
      };
    } catch (error) {
      console.error('Rate limit store get error:', error);
      return undefined;
    } finally {
      timer();
    }
  },

  /**
   * Increment hits for a key
   * @param {string} key - The rate limit key
   * @returns {Promise<ClientRateLimitInfo>}
   */
  async increment(key: string) {
    const timer = rateLimitMetrics.duration.startTimer({ operation: 'increment' });
    try {
      const sanitizedKey = sanitizeKey(key);
      const now = new Date();
      const resetTime = new Date(now.getTime() + Config.RATE_LIMIT_WINDOW_MS);
      const data = rateLimitStore.get(sanitizedKey) || { hits: 0, resetTime };
      
      const newData = {
        hits: data.hits + 1,
        resetTime: data.resetTime
      };
      
      rateLimitStore.set(sanitizedKey, newData);
      rateLimitMetrics.hits.inc({ limiter_type: 'default' });
      
      return {
        totalHits: newData.hits,
        resetTime: newData.resetTime
      };
    } catch (error) {
      console.error('Rate limit store increment error:', error);
      throw error;
    } finally {
      timer();
    }
  },

  /**
   * Decrement hits for a key
   * @param {string} key - The rate limit key
   */
  async decrement(key: string): Promise<void> {
    const timer = rateLimitMetrics.duration.startTimer({ operation: 'decrement' });
    try {
      const sanitizedKey = sanitizeKey(key);
      const data = rateLimitStore.get(sanitizedKey);
      if (data && data.hits > 0) {
        rateLimitStore.set(sanitizedKey, {
          ...data,
          hits: data.hits - 1
        });
      }
    } catch (error) {
      console.error('Rate limit store decrement error:', error);
    } finally {
      timer();
    }
  },

  /**
   * Reset rate limit for a key
   * @param {string} key - The rate limit key
   */
  async resetKey(key: string): Promise<void> {
    const timer = rateLimitMetrics.duration.startTimer({ operation: 'reset' });
    try {
      rateLimitStore.delete(sanitizeKey(key));
    } catch (error) {
      console.error('Rate limit store reset error:', error);
    } finally {
      timer();
    }
  }
};

export const sensitiveOpsLimiter = rateLimit({
  windowMs: Config.SENSITIVE_RATE_LIMIT_WINDOW_MS,
  max: Config.SENSITIVE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: customStore,
  handler: (_req: Request, res: Response) => {
    rateLimitMetrics.exceeded.inc({ limiter_type: 'sensitive_ops' });
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    });
  }
});

export const paymentRateLimiter = rateLimit({
  windowMs: Config.PAYMENT_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: Config.PAYMENT_RATE_LIMIT_MAX || 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: customStore,
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body?.customerId || 'anonymous');
  },
  handler: (_req: Request, res: Response) => {
    rateLimitMetrics.exceeded.inc({ limiter_type: 'payment' });
    res.status(429).json({
      status: 'error',
      code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
      message: 'Too many payment requests, please try again later'
    });
  }
});

// Export for testing purposes
export const __testing__ = {
  clearStore: () => rateLimitStore.clear(),
  getStore: () => rateLimitStore,
  sanitizeKey
};