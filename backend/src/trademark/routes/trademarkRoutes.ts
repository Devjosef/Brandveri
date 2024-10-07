import express, { Request, Response } from 'express';
import { trademarkService } from '../services/trademarkService';
import { ApiResponse, TrademarkSearchParams } from '../../../types/trademark';

const router = express.Router();

/**
 * Route to search for trademarks.
 * @route GET /api/trademark/search
 * @param query - The search query for trademarks.
 * @param page - The page number for pagination.
 * @param limit - The number of results per page.
 */
router.get('/search', async (req: Request, res: Response<ApiResponse<any>>) => {
    const { query, page, limit } = req.query;

    try {
        // Construct search parameters
        const params: TrademarkSearchParams = {
            query: query as string,
            page: parseInt(page as string) || 1,
            limit: parseInt(limit as string) || 10,
        };

        // Call the TrademarkService to search trademarks
        const response = await trademarkService.searchTrademark(params);

        // Return the response
        res.status(response.success ? 200 : 500).json(response);
    } catch (error) {
        console.error('Error in trademark search route:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while searching trademarks.',
        });
    }
});

/**
 * Middleware to set API keys from environment variables.
 */
router.use((req, res, next) => {
    // Set the EUIPO and USPTO API keys from environment variables
    req.app.locals.euipoApiKey = process.env.EUIPO_API_KEY;
    req.app.locals.usptoApiKey = process.env.USPTO_API_KEY;
    next();
});

export default router;
