import express, { Router, Request, Response } from 'express';
import { trademarkController } from '../controllers/trademarkController';
import { AsyncLock } from '../../utils/AsyncLock';
import { sensitiveOpsLimiter } from '../../../middleware/ratelimiter';
import { corsMiddleware } from '../../../middleware/corsMiddleware';
import { authenticateToken } from '../../../middleware/auth';
import { Counter, Histogram } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';
import { featureFlags } from '../utils/validation';
import { Invariant } from '../../utils/invariant';

const router: Router = express.Router();
const logger = loggers.trademark;
const asyncLock = new AsyncLock();

/**
 * We separate metrics to detect:
 * - Traffic anomalies per path.
 * - Performance degradation patterns.
 * - Rate limit effectiveness.
 */
const routeMetrics = {
    requests: new Counter({
        name: 'trademark_route_requests_total',
        help: 'Total number of trademark route requests',
        labelNames: ['method', 'path', 'status']
    }),
    latency: new Histogram({
        name: 'trademark_route_latency_seconds',
        help: 'Latency of trademark route operations',
        labelNames: ['method', 'path'],
        buckets: [0.1, 0.5, 1, 2, 5]
    })
};

/**
 * Factory pattern enables:
 * - Dynamic feature flag evaluation.
 * - Middleware composition testing.
 * - Isolated rate limit policies.
 */
const createSearchRoute = () => {
    const baseMiddleware = [
        corsMiddleware,
        authenticateToken
    ];

     /**
     * Split middleware to:
     * - Isolate security from operational concerns
     * - Enable granular feature control
     */
    const conditionalMiddleware = featureFlags.TRADEMARK.ENABLE_RATE_LIMITING 
        ? [sensitiveOpsLimiter] 
        : [];

    /**
     * Lock by IP to:
     * - Prevent duplicate search spam
     * - Protect downstream trademark APIs
     * - Ensure fair resource distribution
     */
    const requestHandler = async (req: Request, res: Response): Promise<void> => {
        const timer = routeMetrics.latency.startTimer();
        const lockKey = `trademark-search-${req.ip}`;
        
        try {
            await asyncLock.acquire(lockKey);
            routeMetrics.requests.inc({ 
                method: 'GET', 
                path: '/search', 
                status: 'attempt' 
            });
            
            await trademarkController.searchTrademark(req, res);
            
            routeMetrics.requests.inc({ 
                method: 'GET', 
                path: '/search', 
                status: 'success' 
            });
        } catch (error) {
            logger.error({ error, path: '/search' }, 'Search route error');
            routeMetrics.requests.inc({ 
                method: 'GET', 
                path: '/search', 
                status: 'error' 
            });
            throw error;
        } finally {
            asyncLock.release(lockKey);
            timer({ method: 'GET', path: '/search' });
        }
    };

    return [...baseMiddleware, ...conditionalMiddleware, requestHandler];
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

router.get('/search', ...createSearchRoute());

export default router;
