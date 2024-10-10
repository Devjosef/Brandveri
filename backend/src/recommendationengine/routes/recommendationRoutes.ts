import express, { Request, Response } from 'express';
import recommendationController from '../controllers/recommendationController';

const router = express.Router();

/**
 * Route to get recommendations.
 * @route POST /api/recommendations
 */
router.post('/recommendations', async (req: Request, res: Response) => {
    await recommendationController.getRecommendations(req, res);
});

export default router;