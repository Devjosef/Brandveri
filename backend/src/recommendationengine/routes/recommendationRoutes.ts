import express, { Request, Response, NextFunction } from 'express';
import recommendationController from '../controllers/recommendationController';
import { rateLimiter, corsMiddleware } from '../../../middleware/ratelimiter';
import { validateApiKey } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/errorHandlers';
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
    validateApiKey,
    rateLimiter,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        routeMetrics.inc({ method: 'POST', path: '/recommendations' });
        
        // Set security headers
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        
        await recommendationController.getRecommendations(req, res);
    })
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
router.get('/health', (req: Request, res: Response) => {
    routeMetrics.inc({ method: 'GET', path: '/health' });
    res.status(200).json({ status: 'healthy' });
});

export default router;
