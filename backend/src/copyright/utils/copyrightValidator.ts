import { z } from 'zod';
import { CopyrightError } from './copyrightError';
import { Counter, Histogram } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';
import { crConfig } from './crConfig';
import { validatePayloadSize, sanitizeRequest } from '../../utils/requestValidators';
import { invariant } from '../../utils/invariant';
import { SoftwareSearchParams } from '../../../types/copyright';

const logger = loggers.copyright;

/**
 * Metrics for validation operations
 */
const validationMetrics = {
    operations: new Counter({
        name: 'copyright_validation_operations_total',
        help: 'Total number of copyright validation operations',
        labelNames: ['operation', 'status']
    }),
    duration: new Histogram({
        name: 'copyright_validation_duration_seconds',
        help: 'Duration of copyright validation operations',
        labelNames: ['operation'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1]
    })
};

/**
 * Search parameters validation schema
 */
const searchParamsSchema = z.object({
    query: z.string()
        .min(crConfig.SEARCH.MIN_QUERY_LENGTH, 'Query too short')
        .max(crConfig.VALIDATION.MAX_QUERY_SIZE, 'Query too long')
        .transform(str => str.trim()),
    type: z.enum(['PROPRIETARY', 'OPEN_SOURCE', 'ALL']).optional(),
    license: z.array(z.string()).optional(),
    minStars: z.number().min(0).optional(),
    minConfidence: z.number().min(0).max(1).optional(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(10)
}).strict();

export class CopyrightValidator {
    /**
     * Validates search query and parameters
     */
    validateSearchQuery(
        query: string, 
        params?: Partial<SoftwareSearchParams>
    ): { query: string; params: SoftwareSearchParams } {
        const timer = validationMetrics.duration.startTimer({ operation: 'search' });
        
        try {
            validationMetrics.operations.inc({ operation: 'search', status: 'attempt' });

            // Basic input validation
            invariant(query?.length > 0, 'Query is required');
            validatePayloadSize(query, crConfig.VALIDATION.MAX_QUERY_SIZE);
            
            // Sanitize and validate query
            const sanitizedQuery = sanitizeRequest({ query }).query as string;
            
            // Validate complete params
            const validatedParams = searchParamsSchema.parse({
                query: sanitizedQuery,
                ...params
            });

            validationMetrics.operations.inc({ operation: 'search', status: 'success' });
            return validatedParams;

        } catch (error) {
            validationMetrics.operations.inc({ operation: 'search', status: 'error' });
            logger.warn({ error, query, params }, 'Search validation failed');
            
            throw new CopyrightError(
                'VALIDATION_ERROR',
                'Invalid search parameters',
                { query, params, error }
            );
        } finally {
            timer();
        }
    }

    /**
     * Validates repository parameters
     */
    validateRepoParams(owner: string, repo: string): { owner: string; repo: string } {
        const timer = validationMetrics.duration.startTimer({ operation: 'repo' });
        
        try {
            validationMetrics.operations.inc({ operation: 'repo', status: 'attempt' });

            // Basic validation
            invariant(owner?.length > 0, 'Owner is required');
            invariant(repo?.length > 0, 'Repository name is required');
            
            // Size validation
            validatePayloadSize(
                owner + repo, 
                crConfig.VALIDATION.MAX_PATH_SIZE
            );

            // Sanitize input
            const sanitized = sanitizeRequest({ owner, repo });
            
            validationMetrics.operations.inc({ operation: 'repo', status: 'success' });
            return {
                owner: sanitized.owner as string,
                repo: sanitized.repo as string
            };

        } catch (error) {
            validationMetrics.operations.inc({ operation: 'repo', status: 'error' });
            logger.warn({ error, owner, repo }, 'Repository validation failed');
            
            throw new CopyrightError(
                'VALIDATION_ERROR',
                'Invalid repository parameters',
                { owner, repo, error }
            );
        } finally {
            timer();
        }
    }
}