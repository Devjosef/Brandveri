import compression from 'compression';
import { Router } from 'express';
import { copyrightController } from '../controllers/copyrightController';
import { createValidator } from '../../../middleware/validator';
import { authenticateToken } from '../../../middleware/auth';
import { CopyrightError } from '../utils/copyrightError';
import { loggers } from '../../../observability/contextLoggers';
import { z } from 'zod';
import { copyrightLimiter } from '../../../middleware/ratelimiter';

const logger = loggers.copyright;

// Validation schemas using Zod
const validationSchemas = {
    search: z.object({
        q: z.string()
            .trim()
            .min(3, 'Search query must be between 3 and 100 characters')
            .max(100, 'Search query must be between 3 and 100 characters'),
        type: z.enum(['PROPRIETARY', 'OPEN_SOURCE', 'ALL'])
            .optional(),
        page: z.number()
            .int()
            .min(1, 'Page must be between 1 and 100')
            .max(100, 'Page must be between 1 and 100')
            .optional(),
        limit: z.number()
            .int()
            .min(1, 'Limit must be between 1 and 50')
            .max(50, 'Limit must be between 1 and 50')
            .optional()
    }).strict(),

    details: z.object({
        owner: z.string()
            .trim()
            .regex(/^[a-zA-Z0-9\-]+$/, 'Invalid owner name format'),
        repo: z.string()
            .trim()
            .regex(/^[a-zA-Z0-9\-_.]+$/, 'Invalid repository name format')
    }).strict()
};

/**
 * Copyright routes handler
 * Implements rate limiting, authentication, and validation
 */
export const copyrightRoutes = Router();

// Add compression middleware
copyrightRoutes.use(compression());

// Add health check endpoint
copyrightRoutes.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Add cache headers middleware
copyrightRoutes.use((req, res, next) => {
    if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    }
    next();
});

// Global middleware
copyrightRoutes.use(authenticateToken);
copyrightRoutes.use((req, _res, next) => {
    logger.info({ 
        path: req.path, 
        method: req.method,
        userId: req.user?.id,
        ip: req.ip 
    }, 'Copyright route accessed');
    next();
});

/**
 * @route   GET /api/copyright/software/search
 * @desc    Search for software copyrights
 * @access  Private
 */
copyrightRoutes.get(
    '/software/search',
    copyrightLimiter.search,
    createValidator(validationSchemas.search, 'copyright.search'),
    (req, res, next) => {
        copyrightController.searchSoftwareCopyright(req, res, next).catch(next);
    }
);

/**
 * @route   GET /api/copyright/software/:owner/:repo
 * @desc    Get detailed copyright information for a specific repository
 * @access  Private
 */
copyrightRoutes.get(
    '/software/:owner/:repo',
    copyrightLimiter.details,
    createValidator(validationSchemas.details, 'copyright.details'),
    (req, res, next) => {
    copyrightController.getSoftwareCopyrightDetails(req, res, next).catch(next);
}
);

// Error handling middleware
copyrightRoutes.use((err: Error, req: any, res: any, next: any) => {
    if (err instanceof CopyrightError) {
        logger.warn({ err, path: req.path }, 'Copyright route error');
        return res.status(400).json({
            success: false,
            error: err.message,
            code: err.code
        });
    }
    logger.error({ err, path: req.path }, 'Unexpected error in copyright routes');
    next(err);
});
