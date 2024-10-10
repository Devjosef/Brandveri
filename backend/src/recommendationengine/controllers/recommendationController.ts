import { Request, Response } from 'express';
import RecommendationService from '../services/recommendationService';
import { RecommendationRequest } from '../types/recommendationEngine';

/**
 * RecommendationController class handles recommendation-related requests.
 */
class RecommendationController {
    /**
     * Retrieves recommendations based on user preferences.
     * @param req - Express request object.
     * @param res - Express response object.
     */
    public async getRecommendations(req: Request, res: Response): Promise<void> {
        try {
            const request: RecommendationRequest = req.body;
            const response = await RecommendationService.getRecommendations(request);
            res.status(200).json(response);
        } catch (error: any) {
            console.error('Error in RecommendationController.getRecommendations:', error);
            res.status(500).json({ error: 'An error occurred while fetching recommendations.' });
        }
    }
}

// Instantiate the controller
const recommendationController = new RecommendationController();

// Export the controller
export default recommendationController;