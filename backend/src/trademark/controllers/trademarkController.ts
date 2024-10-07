import { Request, Response } from 'express';
import { trademarkService } from '../services/trademarkService';
import { ApiResponse, TrademarkSearchParams } from '../../../types/trademark';

/**
 * TrademarkController class handles trademark-related requests.
 */
class TrademarkController {
    /**
     * Searches for trademarks based on query parameters.
     * @param req - Express request object.
     * @param res - Express response object.
     */
    public async search(req: Request, res: Response<ApiResponse<any>>): Promise<void> {
        const { query, page, limit } = req.query;

        // Construct search parameters
        const params: TrademarkSearchParams = {
            query: query as string,
            page: parseInt(page as string) || 1,
            limit: parseInt(limit as string) || 10,
        };

        try {
            // Call the TrademarkService to search trademarks
            const response = await trademarkService.searchTrademark(params);

            // Return the response with appropriate status code
            res.status(response.success ? 200 : 500).json(response);
        } catch (error) {
            console.error('Error in TrademarkController.search:', error);
            res.status(500).json({
                success: false,
                error: 'An error occurred while searching trademarks.',
            });
        }
    }
}

// Instantiate the controller
const trademarkController = new TrademarkController();

// Export the controller
export default trademarkController;
