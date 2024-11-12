import session from 'express-session';
import RedisStore from "connect-redis";
import redisClient from './redis';
import { createMetricsCollector } from './metrics';

interface SessionConfig {
  secret: string;
  name?: string;
  cookie: {
    secure: boolean;
    httpOnly: boolean;
    maxAge: number;
    sameSite: boolean | 'lax' | 'strict' | 'none';
    domain?: string;
    path?: string;
  };
  rolling?: boolean;
  resave: boolean;
  saveUninitialized: boolean;
  proxy?: boolean;
}

const metricsCollector = createMetricsCollector();

// Session cleanup job interval (12 hours)
const CLEANUP_INTERVAL = 12 * 60 * 60 * 1000;

// Session configuration
const ENHANCED_CONFIG: SessionConfig = {
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  name: '__bv_sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 1000, // 1 hour
    sameSite: 'strict',
    path: '/',
    domain: process.env.COOKIE_DOMAIN
  },
  rolling: true,
  saveUninitialized: false,
  resave: false,
  proxy: process.env.NODE_ENV === 'production'
};

const store = new RedisStore({ 
  client: redisClient,
  prefix: 'bvsess:',
  ttl: ENHANCED_CONFIG.cookie.maxAge / 1000,
  disableTouch: false
});

// Session cleanup job
async function cleanupExpiredSessions() {
  try {
    const pattern = 'bvsess:*';
    const keys = await redisClient.keys(pattern);
    let cleaned = 0;

    for (const key of keys) {
      const session = await redisClient.get(key);
      if (session) {
        const sessionData = JSON.parse(session);
        if (sessionData.cookie && new Date(sessionData.cookie.expires) < new Date()) {
          await redisClient.del(key);
          cleaned++;
        }
      }
    }

    console.log(`Cleaned up ${cleaned} expired sessions`);
    metricsCollector.recordOperation('metrics_collection', 'success');
  } catch (error) {
    console.error('Session cleanup error:', error);
    metricsCollector.recordOperation('metrics_collection', 'error');
  }
}

// Schedule cleanup job
setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL);

store.on('connect', () => {
  console.log('Session store connected to Redis');
  metricsCollector.recordOperation('ping', 'success');
});

store.on('error', (err) => {
  console.error('Session store error:', err);
  metricsCollector.recordOperation('ping', 'error');
});

export const sessionMiddleware = session({
  ...ENHANCED_CONFIG,
  store
});
