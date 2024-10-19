import session from 'express-session';
import RedisStore from "connect-redis"
import redisClient from './redis'; // Import the Redis client

// Session middleware configuration using Redis
export const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }), // Use 'new' to instantiate RedisStore
  secret: process.env.SESSION_SECRET || 'your_secret_key', // Secret for session encryption
  resave: false, // Prevents session resaving if not modified
  saveUninitialized: false, // Don't save uninitialized sessions
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Secure cookies in production
    httpOnly: true, // Prevent client-side JS from accessing the cookie
    maxAge: 3600000 // 1 hour session expiration
  }
});
