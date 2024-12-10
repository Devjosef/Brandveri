import { Request, Response, NextFunction } from 'express';
import { copyrightService } from '../services/copyrightService';
import { loggers } from '../../../observability/contextLoggers';
import { z } from 'zod';

const logger = loggers.copyright;

/**
 * Search query validation schema
 * Reasoning: Ensure query parameters meet requirements before hitting GitHub API
 */
const searchQuerySchema = z.object({
    query: z.string()
        .min(3, 'Search query must be at least 3 characters')
        .max(100, 'Search query too long'),
    page: z.number().optional().default(1),
    limit: z.number().optional().default(10)
});

class CopyrightController {
    /**
     * Search for software copyrights
     * Reasoning: 
     * 1. Input validation before service call
     * 2. Proper error handling for client
     * 3. Consistent response format
     */
    async searchSoftwareCopyright(
        req: Request, 
        res: Response, 
        next: NextFunction
    ): Promise<Response | void> {
        try {
            const validatedQuery = searchQuerySchema.parse({
                query: req.query.q,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10
            });

            logger.info({ 
                query: validatedQuery,
                userId: req.user?.id 
            }, 'Software copyright search initiated');

            const results = await copyrightService.searchCopyright(
                validatedQuery.query
            );

            return res.status(200).json({
                success: true,
                data: results.data,
                metadata: {
                    ...results.metadata,
                    query: validatedQuery.query,
                    page: validatedQuery.page,
                    limit: validatedQuery.limit
                }
            });

        } catch (error) {
            logger.error({ 
                error,
                query: req.query,
                userId: req.user?.id
            }, 'Software copyright search failed');

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid search parameters',
                    details: error.errors
                });
            }

            return next(error);
        }
    }

    /**
     * Get detailed copyright information
     * Reasoning: Provide detailed view of a specific software copyright
     */
    async getSoftwareCopyrightDetails(
        req: Request, 
        res: Response, 
        next: NextFunction
    ): Promise<Response | void> {
        try {
            const { owner, repo } = req.params;

            logger.info({ 
                owner,
                repo,
                userId: req.user?.id 
            }, 'Software copyright details requested');

            const details = await copyrightService.getRepositoryDetails(
                owner,
                repo
            );

            return res.status(200).json({
                success: true,
                data: details
            });

        } catch (error) {
            logger.error({ 
                error,
                params: req.params,
                userId: req.user?.id
            }, 'Failed to get software copyright details');

            return next(error);
        }
    }
}

export const copyrightController = new CopyrightController();