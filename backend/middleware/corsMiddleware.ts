import cors, { CorsOptions } from 'cors';
import { loggers } from '../observability/contextLoggers';

const logger = loggers.api;

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
        const isAllowed = !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin);
        
        if (isAllowed) {
            callback(null, true);
        } else {
            logger.warn({ origin }, 'CORS request blocked from unauthorized origin');
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
    credentials: true
};

export const corsMiddleware = cors(corsOptions);