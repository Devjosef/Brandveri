import express, { Request, Response, NextFunction } from 'express';
import recommendationController from '../controllers/recommendationController';
import { sensitiveOpsLimiter } from '../../../middleware/ratelimiter';
import { authenticateToken } from '../../../middleware/auth';
import { corsMiddleware } from '../../../middleware/corsMiddleware';
import { AsyncLock } from '../../utils/AsyncLock';
import { loggers } from '../../../observability/contextLoggers';
import { Counter } from 'prom-client';

const router = express.Router();
const logger = loggers.recommendation;

const routeMetrics = new Counter({
    name: 'recommendation_route_requests_total',
    help: 'Total number of requests to recommendation routes',
    labelNames: ['method', 'path', 'status']
});

router.post('/recommendations', 
    corsMiddleware,
    authenticateToken,
    sensitiveOpsLimiter,
    async (req: Request, res: Response, _next: NextFunction) => {
        const asyncLock = new AsyncLock();
        try {
            await asyncLock.acquire('recommendations');
            logger.info({ 
                userId: req.user?.id,
                path: '/recommendations',
                method: 'POST'
            }, 'Processing recommendation request');
            
            routeMetrics.inc({ method: 'POST', path: '/recommendations' });
            
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Pragma', 'no-cache');
            
            await recommendationController.getRecommendations(req, res);
        } catch (error) {
            logger.error({
                error: error instanceof Error ? error.message : 'Unknown error',
                path: '/recommendations',
                method: 'POST'
            }, 'Route handler error');
            throw error;
        } finally {
            asyncLock.release('recommendations');
        }
    }
);