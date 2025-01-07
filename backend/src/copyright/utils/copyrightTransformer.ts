import type { 
    GitHubRepository, 
    SoftwareCopyright, 
    ApiResponse,
    License 
} from "../../../types/copyright";
import { CopyrightError, CopyrightErrorCode } from './copyrightError';
import { loggers } from '../../../observability/contextLoggers';
import { Counter } from 'prom-client';

// Domain-specific validators
import { GitHubValidator } from './validators/githubValidator';
import { CopyrightValidator } from './validators/copyrightValidator';

// Pure transformation functions
import { 
    transformRepository,
    transformLicense,
    transformCopyrightStatus 
} from './transformers';

const logger = loggers.copyright;

// Immutable metrics
const transformMetrics = Object.freeze({
    malformedData: new Counter({
        name: 'copyright_malformed_data_total',
        help: 'Total number of malformed data encounters',
        labelNames: ['field', 'operation']
    }),
    errors: new Counter({
        name: 'copyright_transform_errors_total',
        help: 'Total number of transformation errors',
        labelNames: ['type', 'operation']
    })
});

/**
 * Transforms GitHub repository data into copyright information.
 * Follows functional programming principles and maintains immutability.
 */
export class CopyrightTransformer {
    private readonly githubValidator: GitHubValidator;
    private readonly copyrightValidator: CopyrightValidator;

    constructor() {
        this.githubValidator = new GitHubValidator();
        this.copyrightValidator = new CopyrightValidator();
    }

    /**
     * Pure transformation function that converts GitHub data to copyright data
     */
    public transform(repo: GitHubRepository): SoftwareCopyright {
        try {
            // Validate input
            this.validateInput(repo);

            // Transform data using pure functions
            const copyright = this.createCopyright(repo);

            // Validate output
            this.validateOutput(copyright);

            return copyright;

        } catch (error) {
            this.handleTransformError(error, repo);
            throw error;
        }
    }

    /**
     * Input validation using composition
     */
    private validateInput(repo: GitHubRepository): void {
        try {
            this.githubValidator.validate(repo);
        } catch (error) {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Invalid GitHub repository data',
                { error }
            );
        }
    }

    /**
     * Pure function to create copyright data
     */
    private createCopyright(repo: GitHubRepository): SoftwareCopyright {
        return Object.freeze({
            id: String(repo.id),
            name: repo.name,
            type: this.determineType(repo),
            repository: transformRepository(repo),
            license: this.transformLicenseWithValidation(repo.license),
            copyrightStatus: transformCopyrightStatus(repo),
            validationStatus: {
                isValid: true,
                lastValidated: new Date()
            }
        });
    }

    /**
     * Pure function to determine repository type
     */
    private determineType(repo: GitHubRepository): SoftwareCopyright['type'] {
        if (repo.private) return 'PROPRIETARY';
        if (repo.license) return 'OPEN_SOURCE';
        return 'UNKNOWN';
    }

    /**
     * Transform license with validation
     */
    private transformLicenseWithValidation(
        license: GitHubRepository['license']
    ): License | null {
        if (!license) return null;
        
        const transformedLicense: License = {
            type: license.spdx_id || 'UNKNOWN',
            url: license.url,
            permissions: [],
            limitations: []
        };

        this.validateLicense(transformedLicense);
        return transformedLicense;
    }

    /**
     * Validate license data
     */
    private validateLicense(license: License): void {
        if (!license.type) {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'License must have a type'
            );
        }
    }

    /**
     * Output validation
     */
    private validateOutput(copyright: SoftwareCopyright): void {
        try {
            this.copyrightValidator.validate(copyright);
        } catch (error) {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Invalid copyright data structure',
                { error }
            );
        }
    }

    /**
     * Error handling with proper metrics
     */
    private handleTransformError(error: unknown, context: unknown): void {
        transformMetrics.errors.inc({ 
            type: error instanceof CopyrightError ? error.code : 'UNKNOWN_ERROR',
            operation: 'transform'
        });
        
        logger.error({ 
            error, 
            context,
            stack: error instanceof Error ? error.stack : undefined
        }, 'Transform operation failed');
    }

    /**
     * Create API response with proper typing
     */
    public createApiResponse<T>(data: T, requestId: string): ApiResponse<T> {
        return Object.freeze({
            success: true,
            data,
            metadata: {
                timestamp: new Date().toISOString(),
                requestId,
                source: 'GITHUB',
                disclaimer: 'Software is automatically protected by copyright upon creation'
            }
        });
    }
}