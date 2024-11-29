import express, { Request, Response, NextFunction } from 'express';
import recommendationController from '../controllers/recommendationController';
import { sensitiveOpsLimiter, } from '../../../middleware/ratelimiter';
import { authenticateToken } from '../../../middleware/auth';
import { AsyncLock } from '../utils/asyncLock';
import { loggers } from '../../../observability/contextLoggers';
import { Counter } from 'prom-client';

const router = express.Router();
const logger = loggers.recommendation;

const routeMetrics = new Counter({
    name: 'recommendation_route_requests_total',
    help: 'Total number of requests to recommendation routes',
    labelNames: ['method', 'path', 'status']
});

/**
 * @swagger
 * /api/recommendations:
 *   post:
 *     summary: Generate brand recommendations
 *     tags: [Recommendations]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecommendationRequest'
 *     responses:
 *       200:
 *         description: Successful recommendation generation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecommendationResponse'
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/recommendations', 
    corsMiddleware,
    authenticateToken,
    sensitiveOpsLimiter,
    async (req: Request, res: Response, _next: NextFunction) => {
        const asyncLock = new AsyncLock();
        try {
            await asyncLock.acquire('recommendations');
            routeMetrics.inc({ method: 'POST', path: '/recommendations' });
            
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Pragma', 'no-cache');
            
            await recommendationController.getRecommendations(req, res);
        } finally {
            asyncLock.release('recommendations');
        }
    }
);

/**
 * Health check endpoint for load balancers
 * @swagger
 * /api/recommendations/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', (_req: Request, res: Response) => {
    routeMetrics.inc({ method: 'GET', path: '/health' });
    res.status(200).json({ status: 'healthy' });
});

export default router;
