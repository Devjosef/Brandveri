import { Router } from 'express';
import { copyrightController } from '../controllers/copyrightController';
import { validateRequest } from '../../middleware/validateRequest';
import { rateLimiter } from '../../middleware/rateLimiter';
import { authenticate } from '../../middleware/authenticate';

/**
 * Copyright routes
 * Reasoning:
 * 1. Authentication required for all routes
 * 2. Rate limiting to prevent abuse
 * 3. Request validation
 */
const router = Router();

router.use(authenticate); // Protect all routes
router.use(rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
}));

/**
 * @route   GET /api/copyright/software/search
 * @desc    Search for software copyrights
 * @access  Private
 */
router.get(
    '/software/search',
    validateRequest({
        query: {
            q: {
                in: 'query',
                isString: true,
                required: true,
                min: 3,
                max: 100
            }
        }
    }),
    copyrightController.searchSoftwareCopyright
);

/**
 * @route   GET /api/copyright/software/:owner/:repo
 * @desc    Get detailed copyright information for a specific repository
 * @access  Private
 */
router.get(
    '/software/:owner/:repo',
    validateRequest({
        params: {
            owner: {
                in: 'params',
                isString: true,
                required: true
            },
            repo: {
                in: 'params',
                isString: true,
                required: true
            }
        }
    }),
    copyrightController.getSoftwareCopyrightDetails
);

export { router as copyrightRoutes };
