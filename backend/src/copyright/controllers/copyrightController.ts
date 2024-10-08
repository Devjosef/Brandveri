import { Request, Response } from 'express';
import { copyrightService } from '../services/copyrightService';
import { ApiResponse, CopyrightSearchParams } from '@types';

/**
 * CopyrightController class handles copyright-related requests.
 */
class CopyrightController {
    /**
     * Searches for copyrights based on the query parameters.
     * @param req - Express request object.
     * @param res - Express response object.
     */
    public async search(req: Request, res: Response<ApiResponse<any>>): Promise<void> {
        const { query, page, limit } = req.query;

        // Construct search parameters
        const params: CopyrightSearchParams = {
            query: query as string,
            page: parseInt(page as string) || 1,
            limit: parseInt(limit as string) || 10,
        };

        try {
            // Call the CopyrightService to search copyrights
            const response = await copyrightService.searchCopyright(params);

            // Return the response with appropriate status code
            res.status(response.success ? 200 : 500).json(response);
        } catch (error) {
            console.error('Error in CopyrightController.search:', error);
            res.status(500).json({
                success: false,
                error: 'An error occurred while searching copyrights.',
            });
        }
    }

    async register(req: Request, res: Response) {
        try {
            const copyright = await copyrightService.registerCopyright(req.body);
            res.status(201).json(copyright);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async get(req: Request, res: Response) {
        try {
            const copyright = await copyrightService.getCopyrightById(req.params.id);
            if (copyright) {
                res.status(200).json(copyright);
            } else {
                res.status(404).json({ error: 'Copyright not found' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const updatedCopyright = await copyrightService.updateCopyright(req.params.id, req.body);
            if (updatedCopyright) {
                res.status(200).json(updatedCopyright);
            } else {
                res.status(404).json({ error: 'Copyright not found' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const success = await copyrightService.deleteCopyright(req.params.id);
            if (success) {
                res.status(204).send();
            } else {
                res.status(404).json({ error: 'Copyright not found' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

// Instantiate the controller
const copyrightController = new CopyrightController();

// Export the controller
export default copyrightController;