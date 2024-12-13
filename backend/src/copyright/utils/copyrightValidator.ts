import { DataValidator } from '../../utils/validators';
import { sanitizeRequest } from '../../utils/requestValidators';
import { z } from 'zod';
import { CopyrightError, CopyrightErrorCode } from './copyrightError';
import { loggers } from '../../../observability/contextLoggers';
import { SoftwareCopyright, SoftwareSearchParams } from '../../../types/copyright';
import { crConfig } from './crConfig';
import { invariant } from '../../utils/invariant';

const logger = loggers.copyright;

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

/**
 * Transformed data validation schema
 */
const transformedDataSchema = z.object({
    id: z.string().min(1, 'ID is required'),
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['PROPRIETARY', 'OPEN_SOURCE', 'UNKNOWN']),
    repository: z.object({
        url: z.string().url('Invalid repository URL'),
        owner: z.string().min(1, 'Owner is required'),
        name: z.string().min(1, 'Repository name is required'),
        stars: z.number().min(0, 'Stars must be non-negative'),
        createdAt: z.date(),
        lastUpdated: z.date()
    }),
    license: z.object({
        type: z.string(),
        url: z.string().url().optional(),
        permissions: z.array(z.string()).optional(),
        limitations: z.array(z.string()).optional()
    }),
    copyrightStatus: z.object({
        isProtected: z.boolean(),
        creationDate: z.date(),
        jurisdiction: z.string(),
        explanation: z.string()
    }),
    validationStatus: z.object({
        isValid: z.boolean(),
        errors: z.array(z.string()).optional(),
        lastValidated: z.date()
    })
}).strict();

export class CopyrightValidator {
    validateSearchQuery(
        query: string, 
        params?: Partial<SoftwareSearchParams>
    ): { query: string; params: SoftwareSearchParams } {
        try {
            invariant(query?.length > 0, 'Query is required');
            DataValidator.validateSize(query, crConfig.VALIDATION.MAX_QUERY_SIZE);
            
            const sanitizedQuery = sanitizeRequest({ query }).query as string;
            
            const validatedParams = searchParamsSchema.parse({
                query: sanitizedQuery,
                ...params
            });

            return {
                query: validatedParams.query,
                params: {
                    query: validatedParams.query,
                    type: validatedParams.type,
                    license: validatedParams.license,
                    minStars: validatedParams.minStars,
                    minConfidence: validatedParams.minConfidence,
                    page: validatedParams.page,
                    limit: validatedParams.limit
                }
            };

        } catch (error) {
            logger.warn({ error, query, params }, 'Search validation failed');
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Invalid search parameters',
                { query, params, error }
            );
        }
    }

    validateRepoParams(owner: string, repo: string): { owner: string; repo: string } {
        try {
            invariant(owner?.length > 0, 'Owner is required');
            invariant(repo?.length > 0, 'Repository name is required');
            
            DataValidator.validateSize(
                owner + repo, 
                crConfig.VALIDATION.MAX_PATH_SIZE
            );
            
            const sanitized = sanitizeRequest({ owner, repo });
            
            return {
                owner: sanitized.owner as string,
                repo: sanitized.repo as string
            };

        } catch (error) {
            logger.warn({ error, owner, repo }, 'Repository validation failed');
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Invalid repository parameters',
                { owner, repo, error }
            );
        }
    }

    validateTransformedData(data: unknown): SoftwareCopyright {
        try {
            const sanitizedData = sanitizeRequest(data);
            const validatedData = transformedDataSchema.parse(sanitizedData);
            this.validateBusinessRules(validatedData);
            return validatedData;

        } catch (error) {
            logger.error({ error, data }, 'Transformed data validation failed');
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Invalid transformed data',
                { data, error }
            );
        }
    }

    private validateBusinessRules(data: SoftwareCopyright): void {
        if (data.repository.lastUpdated < data.repository.createdAt) {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Last updated date cannot be before creation date',
                { 
                    createdAt: data.repository.createdAt,
                    lastUpdated: data.repository.lastUpdated 
                }
            );
        }

        if (data.type === 'OPEN_SOURCE' && data.license.type === 'UNKNOWN') {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Open source repository must have a valid license',
                { type: data.type, license: data.license }
            );
        }
    }
}