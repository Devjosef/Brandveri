import express, { Router, Request, Response } from 'express';
import recommendationController from '../controllers/recommendationController';
import { sensitiveOpsLimiter } from '../../../middleware/ratelimiter';
import { authenticateToken } from '../../../middleware/auth';
import { corsMiddleware } from '../../../middleware/corsMiddleware';
import {AsyncLock} from '../../utils/AsyncLock';
import { loggers } from '../../../observability/contextLoggers';
import { Counter, Histogram } from 'prom-client';
import { Invariant } from '../../utils/invariant';

const router: Router = express.Router();
const logger = loggers.recommendation;
const asyncLock = new AsyncLock();

/**
 * We separate metrics to detect:
 * - Recommendation quality patterns
 * - User interaction flows
 * - System performance impacts
 */
const routeMetrics = {
    requests: new Counter({
        name: 'recommendation_route_requests_total',
        help: 'Total number of recommendation route requests',
        labelNames: ['method', 'path', 'status']
    }),
    latency: new Histogram({
        name: 'recommendation_route_latency_seconds',
        help: 'Latency of recommendation operations',
        labelNames: ['method', 'path'],
        buckets: [0.1, 0.5, 1, 2, 5]
    })
};

/**
 * Factory pattern enables:
 * - Consistent middleware chains
 * - Isolated performance monitoring
 * - Centralized error handling
 */
const createRecommendationRoute = () => {
    const baseMiddleware = [
        corsMiddleware,
        authenticateToken,
        sensitiveOpsLimiter
    ];

    /**
     * Lock by user to:
     * - Prevent recommendation spam
     * - Ensure consistent user experience
     * - Manage downstream service load
     */
    const requestHandler = async (req: Request, res: Response): Promise<void> => {
        const timer = routeMetrics.latency.startTimer();
        const lockKey = `recommendations-${req.user?.id || req.ip}`;
        
        try {
            await asyncLock.acquire(lockKey);
            routeMetrics.requests.inc({ 
                method: 'POST', 
                path: '/recommendations', 
                status: 'attempt' 
            });

            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Pragma', 'no-cache');
            
            await recommendationController.getRecommendations(req, res);
            
            routeMetrics.requests.inc({ 
                method: 'POST', 
                path: '/recommendations', 
                status: 'success' 
            });
        } catch (error) {
            logger.error({ 
                error: error instanceof Error ? error.message : 'Unknown error',
                path: '/recommendations',
                method: 'POST'
            }, 'Recommendation route error');
            routeMetrics.requests.inc({ 
                method: 'POST', 
                path: '/recommendations', 
                status: 'error' 
            });
            throw error;
        } finally {
            asyncLock.release(lockKey);
            timer({ method: 'POST', path: '/recommendations' });
        }
    };

    return [...baseMiddleware, requestHandler];
};

/**
 * Early router validation prevents:
 * - Runtime middleware chain errors
 * - Invalid route registrations
 */
Invariant.assert(
    router instanceof Router,
    'Express router must be initialized'
);

router.post('/recommendations', ...createRecommendationRoute());

export { router as recommendationRoutes };