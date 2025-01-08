import type { 
    GitHubRepository, 
    SoftwareCopyright, 
    ApiResponse,
    License 
} from "../../../types/copyright";
import { CopyrightError, CopyrightErrorCode } from './copyrightError';
import { loggers } from '../../../observability/contextLoggers';
import { Counter } from 'prom-client';
import { GitHubValidator } from './githubValidator';
import { CopyrightValidator } from './copyrightValidator';
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
 * Maintains immutability and provides validation.
 */
export class CopyrightTransformer {
    // Cache validator instances at class level with explicit type annotations
    private static readonly githubValidator: GitHubValidator = new GitHubValidator();
    private static readonly copyrightValidator: CopyrightValidator = new CopyrightValidator();

    /**
     * Pure transformation function that converts GitHub data to copyright data.
     */
    public transform(repo: GitHubRepository): SoftwareCopyright {
        try {
            this.validateInput(repo);
            const copyright = this.createCopyright(repo);
            this.validateOutput(copyright);
            return copyright;
        } catch (error) {
            this.handleTransformError(error, repo);
            throw error;
        }
    }

    private validateInput(repo: GitHubRepository): void {
        try {
            CopyrightTransformer.githubValidator.validate(repo);
        } catch (error) {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Invalid GitHub repository data',
                { error }
            );
        }
    }

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

    private determineType(repo: GitHubRepository): SoftwareCopyright['type'] {
        if (repo.private) return 'PROPRIETARY';
        if (repo.license) return 'OPEN_SOURCE';
        return 'UNKNOWN';
    }

    private transformLicenseWithValidation(
        license: GitHubRepository['license']
    ): License | null {
        if (!license) return null;
        
        const transformedLicense = transformLicense(license);
        if (transformedLicense) {
            this.validateLicense(transformedLicense);
        }
        return transformedLicense;
    }

    private validateLicense(license: License): void {
        if (!license.type) {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'License must have a type'
            );
        }
    }

    private validateOutput(copyright: SoftwareCopyright): void {
        try {
            CopyrightTransformer.copyrightValidator.validate(copyright);
        } catch (error) {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Invalid copyright data structure',
                { error }
            );
        }
    }

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