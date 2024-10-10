import express, { Request, Response } from 'express';
import copyrightService from '../services/copyrightService';
import { CopyrightSearchParams, ApiResponse, CopyrightRegistration } from '../../../types/copyright';

const router = express.Router();

/**
 * Middleware to set API keys from environment variables.
 */
router.use((req, res, next) => {
    
    req.app.locals.euipoApiKey = process.env.EUIPO_API_KEY;
    req.app.locals.usptoApiKey = process.env.USPTO_API_KEY;
    next();
});

/**
 * Route to search for copyrights.
 * @route GET /api/copyright/search
 * @param query - The search query for copyrights.
 * @param page - The page number for pagination.
 * @param limit - The number of results per page.
 */
router.get('/search', async (req: Request, res: Response<ApiResponse<any>>) => {
    const { query, page, limit } = req.query;

    try {
        // Construct search parameters
        const params: CopyrightSearchParams = {
            query: query as string,
            page: parseInt(page as string) || 1,
            limit: parseInt(limit as string) || 10,
        };

        // Call the CopyrightService to search copyrights
        const response = await copyrightService.searchCopyright(params);

        // Return the response
        res.status(response.success ? 200 : 500).json(response);
    } catch (error) {
        console.error('Error in copyright search route:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while searching copyrights.',
        });
    }
});

/**
 * Route to register a new copyright.
 * @route POST /api/copyright/register
 * @param data - The copyright registration data.
 */
router.post('/register', async (req: Request, res: Response<ApiResponse<any>>) => {
    try {
        const data: CopyrightRegistration = req.body;

        // Call the CopyrightService to register a copyright
        const response = await copyrightService.registerCopyright(data);

        // Return the response
        res.status(response.success ? 200 : 500).json(response);
    } catch (error) {
        console.error('Error in copyright registration route:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while registering the copyright.',
        });
    }
});

export default router;