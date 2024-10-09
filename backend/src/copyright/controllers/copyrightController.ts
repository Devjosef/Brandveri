import { Request, Response } from 'express';
import CopyrightService from '../services/copyrightService';
import { ApiResponse, CopyrightSearchParams, Copyright, CopyrightRegistration } from '../../../types/copyright';

/**
 * CopyrightController class handles copyright-related requests.
 */
class CopyrightController {
    /**
     * Searches for copyrights based on the query parameters.
     * @param req - Express request object.
     * @param res - Express response object.
     */
    public async search(req: Request, res: Response<ApiResponse<Copyright[]>>): Promise<void> {
        const { query, page, limit } = req.query;

        // Construct search parameters
        const params: CopyrightSearchParams = {
            query: query as string,
            page: parseInt(page as string) || 1,
            limit: parseInt(limit as string) || 10,
        };

        try {
            // Call the CopyrightService to search copyrights
            const response = await CopyrightService.searchCopyright(params);

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

    async register(req: Request, res: Response<ApiResponse<Copyright>>): Promise<void> {
        try {
            const copyright = await CopyrightService.registerCopyright(req.body as CopyrightRegistration);
            res.status(201).json({
                success: true,
                data: copyright,
                error: '',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                data: null,
                error: error.message,
            });
        }
    }

    async get(req: Request, res: Response<ApiResponse<Copyright>>): Promise<void> {
        try {
            const copyright = await CopyrightService.getCopyrightById(req.params.id);
            if (copyright) {
                res.status(200).json({
                    success: true,
                    data: copyright,
                    error: '',
                });
            } else {
                res.status(404).json({
                    success: false,
                    data: null,
                    error: 'Copyright not found',
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                data: null,
                error: error.message,
            });
        }
    }

    async update(req: Request, res: Response<ApiResponse<Copyright>>): Promise<void> {
        try {
            const updatedCopyright = await CopyrightService.updateCopyright(req.params.id, req.body);
            if (updatedCopyright) {
                res.status(200).json({
                    success: true,
                    data: updatedCopyright,
                    error: '',
                });
            } else {
                res.status(404).json({
                    success: false,
                    data: null,
                    error: 'Copyright not found',
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                data: null,
                error: error.message,
            });
        }
    }

    async delete(req: Request, res: Response<ApiResponse<null>>): Promise<void> {
        try {
            const success = await CopyrightService.deleteCopyright(req.params.id);
            if (success) {
                res.status(204).json({
                    success: true,
                    data: null,
                    error: '',
                });
            } else {
                res.status(404).json({
                    success: false,
                    data: null,
                    error: 'Copyright not found',
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                data: null,
                error: error.message,
            });
        }
    }
}

// Instantiate the controller
const copyrightController = new CopyrightController();

// Export the controller
export default copyrightController;