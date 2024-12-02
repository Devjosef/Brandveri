import express from 'express';
import { trademarkController } from '../controllers/trademarkController';
import { asyncHandler } from '../../utils/asyncHandler';
import { rateLimiter } from '../../../middleware/ratelimiter';
import { corsMiddleware } from '../../../middleware/corsMiddleware';
import { authenticateToken } from '../../../middleware/auth';
import { Counter } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';

const router = express.Router();
const logger = loggers.trademark;

const routeMetrics = new Counter({
    name: 'trademark_route_requests_total',
    help: 'Total number of trademark route requests',
    labelNames: ['method', 'path', 'status']
});

router.get('/search',
    corsMiddleware,
    authenticateToken,
    rateLimiter,
    asyncHandler(async (req, res) => {
        routeMetrics.inc({ 
            method: 'GET', 
            path: '/search', 
            status: 'attempt' 
        });
        
        await trademarkController.searchTrademark(req, res);
        
        routeMetrics.inc({ 
            method: 'GET', 
            path: '/search', 
            status: 'success' 
        });
    })
);

export default router;
