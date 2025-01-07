import { DataValidator } from '../../utils/validators';
import { sanitizeRequest } from '../../utils/requestValidators';
import { z } from 'zod';
import { CopyrightError, CopyrightErrorCode } from './copyrightError';
import { loggers } from '../../../observability/contextLoggers';
import { SoftwareCopyright, SoftwareSearchParams } from '../../../types/copyright';
import { crConfig } from './crConfig';
import { invariant } from '../../utils/invariant';

// Constants 
const VALID_PERMISSIONS = Object.freeze(new Set([
    'commercial-use', 
    'modification', 
    'distribution', 
    'private-use'
]));

const VALID_JURISDICTIONS = Object.freeze(new Set([
    'Worldwide', 
    'US', 
    'EU', 
    'Other'
]));

// Domain-specific validation schemas
const domainSchemas = {
    license: z.object({
        type: z.string(),
        url: z.string().url().optional(),
        permissions: z.array(z.string()).optional(),
        limitations: z.array(z.string()).optional()
    }).nullable(),

    repository: z.object({
        url: z.string().url(),
        owner: z.string().min(1),
        name: z.string().min(1),
        stars: z.number().min(0),
        createdAt: z.date(),
        lastUpdated: z.date()
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
};

// Pre-compiled schemas for performance
const schemas = {
    search: z.object({
        query: z.string()
            .min(crConfig.SEARCH.MIN_QUERY_LENGTH)
            .max(crConfig.VALIDATION.MAX_QUERY_SIZE)
            .transform(str => str.trim()),
        type: z.enum(['PROPRIETARY', 'OPEN_SOURCE', 'ALL']).optional(),
        license: z.array(z.string()).optional(),
        minStars: z.number().min(0).optional(),
        minConfidence: z.number().min(0).max(1).optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(10)
    }).strict(),

    repository: z.object({
        owner: z.string().min(1),
        repo: z.string().min(1)
    }).strict(),

    copyright: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        type: z.enum(['PROPRIETARY', 'OPEN_SOURCE', 'UNKNOWN']),
        repository: domainSchemas.repository,
        license: domainSchemas.license,
        copyrightStatus: domainSchemas.copyrightStatus,
        validationStatus: domainSchemas.validationStatus
    }).strict()
};

// Add interface for better abstraction
export interface IValidator<T> {
    validate(data: unknown): T;
}

// Domain-specific validators
const domainValidators = {
    license: {
        validateLicenseType(type: string): void {
            if (!type.match(/^[A-Z0-9\-\.]+$/)) {
                throw new CopyrightError(
                    CopyrightErrorCode.VALIDATION_ERROR,
                    'Invalid license type format'
                );
            }
        },
        validatePermissions(permissions: ReadonlyArray<string>): void {
            permissions.forEach(permission => {
                if (!VALID_PERMISSIONS.has(permission)) {
                    throw new CopyrightError(
                        CopyrightErrorCode.VALIDATION_ERROR,
                        `Invalid permission: ${permission}`
                    );
                }
            });
        }
    },

    repository: {
        validateUrl(url: string): void {
            try {
                new URL(url);
            } catch {
                throw new CopyrightError(
                    CopyrightErrorCode.VALIDATION_ERROR,
                    'Invalid repository URL'
                );
            }
        },
        validateOwner(owner: string): void {
            if (!owner.match(/^[a-zA-Z0-9\-]+$/)) {
                throw new CopyrightError(
                    CopyrightErrorCode.VALIDATION_ERROR,
                    'Invalid owner format'
                );
            }
        }
    },

    copyright: {
        validateJurisdiction(jurisdiction: string): void {
            if (!VALID_JURISDICTIONS.has(jurisdiction)) {
                throw new CopyrightError(
                    CopyrightErrorCode.VALIDATION_ERROR,
                    'Invalid jurisdiction'
                );
            }
        },
        validateDates(creationDate: Date, lastValidated: Date): void {
            const now = new Date();
            if (creationDate > now || lastValidated > now) {
                throw new CopyrightError(
                    CopyrightErrorCode.VALIDATION_ERROR,
                    'Dates cannot be in the future'
                );
            }
        }
    }
};

// Business rule validators
const businessRules = {
    validateDates(data: SoftwareCopyright): void {
        if (data.repository.lastUpdated < data.repository.createdAt) {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Last updated date cannot be before creation date'
            );
        }
        domainValidators.copyright.validateDates(
            data.copyrightStatus.creationDate,
            data.validationStatus.lastValidated
        );
    },

    validateLicense(data: SoftwareCopyright): void {
        if (data.type === 'OPEN_SOURCE' && !data.license) {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Open source repository must have a license'
            );
        }
        if (data.license) {
            domainValidators.license.validateLicenseType(data.license.type);
            if (data.license.permissions) {
                domainValidators.license.validatePermissions(data.license.permissions);
            }
        }
    },

    validateRepository(data: SoftwareCopyright): void {
        domainValidators.repository.validateUrl(data.repository.url);
        domainValidators.repository.validateOwner(data.repository.owner);
    }
};

export class CopyrightValidator implements IValidator<SoftwareCopyright> {
    private readonly logger = loggers.copyright;

    validateSearchQuery(
        query: string, 
        params?: Partial<SoftwareSearchParams>
    ): { query: string; params: SoftwareSearchParams } {
        try {
            invariant(query?.length > 0, 'Query is required');
            DataValidator.validateSize(query, crConfig.VALIDATION.MAX_QUERY_SIZE);
            
            const sanitizedQuery = sanitizeRequest({ query }).query as string;
            
            const validatedParams = schemas.search.parse({
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
            this.logger.warn({ error, query, params }, 'Search validation failed');
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
                `${owner}${repo}`,
                crConfig.VALIDATION.MAX_PATH_SIZE
            );
            
            const sanitized = sanitizeRequest({ owner, repo });
            
            return {
                owner: sanitized.owner as string,
                repo: sanitized.repo as string
            };
        } catch (error) {
            this.logger.warn({ error, owner, repo }, 'Repository validation failed');
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
            const validatedData = schemas.copyright.parse(sanitizedData);
            this.validateBusinessRules(validatedData);
            return validatedData;

        } catch (error) {
            this.logger.error({ error, data }, 'Transformed data validation failed');
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Invalid transformed data',
                { data, error }
            );
        }
    }

    private validateBusinessRules(data: SoftwareCopyright): void {
        businessRules.validateDates(data);
        businessRules.validateLicense(data);
        businessRules.validateRepository(data);
        domainValidators.copyright.validateJurisdiction(data.copyrightStatus.jurisdiction);
    }

    validate(data: unknown): SoftwareCopyright {
        return this.validateTransformedData(data);
    }
}