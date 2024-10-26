import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendationService';
import { RecommendationRequest } from '../../../types/recommendationEngine'
import { validateRecommendationInput } from '../utils/helperFunctions';

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
            // Validate input before passing to the service layer
            const { industry, keywords } = req.body as RecommendationRequest;
            if (!validateRecommendationInput(industry, keywords)) {
                res.status(400).json({ error: 'Invalid input. Ensure industry and keywords are correctly provided.' });
                return;
            }

            // Call the service to get recommendations
            const response = await recommendationService.getRecommendations({
                industry, keywords,
                userId: ''
            });
            res.status(200).json({
                success: true,
                data: response,
                message: 'Recommendations fetched successfully.',
            });
        } catch (error: any) {
            console.error('Error in RecommendationController.getRecommendations:', error.message || error);

            // Differentiating between different errors for more informative responses
            if (error.name === 'ValidationError') {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'An internal server error occurred while fetching recommendations.' });
            }
        }
    }
}

// Instantiate the controller
const recommendationController = new RecommendationController();

// Export the controller
export default recommendationController;