import express from 'express';
import { trademarkController } from '../controllers/trademarkController';
import { asyncHandler } from '../../utils/asyncLock';
import { rateLimiter } from '../../../middleware/ratelimiter';
import { corsMiddleware } from '../../../middleware/corsMiddleware';
import { authenticateToken } from '../../../middleware/auth';
import { Counter, Histogram } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';
import { featureFlags } from '../utils/validation';
import { Invariant } from '../../utils/invariant';

const router = express.Router();
const logger = loggers.trademark;

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

// Verify route invariants
Invariant.assert(
    router !== null,
    'Express router must be initialized'
);

// Configure route with feature flags
const searchRoute = [
    corsMiddleware,
    authenticateToken,
    ...(featureFlags.TRADEMARK.ENABLE_RATE_LIMITING ? [rateLimiter] : []),
    asyncHandler(async (req, res) => {
        const timer = routeMetrics.latency.startTimer();
        
        try {
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
            routeMetrics.requests.inc({ 
                method: 'GET', 
                path: '/search', 
                status: 'error' 
            });
            throw error;
        } finally {
            timer({ method: 'GET', path: '/search' });
        }
    })
];

router.get('/search', ...searchRoute);

export default router;
