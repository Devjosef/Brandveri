import express, { Request, Response } from 'express';
import recommendationController from '../controllers/recommendationController';
import rateLimiter from '../../../middleware/ratelimiter'; 

const router = express.Router();

/**
 * Route to get recommendations.
 * @route POST /api/recommendations
 */
router.post('/recommendations', rateLimiter, async (req: Request, res: Response) => {
    await recommendationController.getRecommendations(req, res);
});

export default router;
