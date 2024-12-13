import { 
    GitHubRepository, 
    SoftwareCopyright, 
    ApiResponse 
} from "../../../types/copyright";
import { CopyrightError, CopyrightErrorCode } from './copyrightError';
import { loggers } from '../../../observability/contextLoggers';
import { Counter } from 'prom-client';

const logger = loggers.copyright;

const transformMetrics = {
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
};

export class CopyrightTransformer {
    transformGithubData(repo: GitHubRepository): SoftwareCopyright {
        try {
            // Handle completely malformed input
            if (!repo || typeof repo !== 'object') {
                transformMetrics.malformedData.inc({ field: 'repo', operation: 'transformGithubData' });
                throw new CopyrightError(
                    CopyrightErrorCode.VALIDATION_ERROR,
                    'Repository data is malformed or missing',
                    { received: typeof repo }
                );
            }

            // Handle missing or malformed essential fields
            const essentialFields = ['id', 'name', 'owner', 'html_url'] as const;
            for (const field of essentialFields) {
                if (!repo[field]) {
                    transformMetrics.malformedData.inc({ field, operation: 'transformGithubData' });
                    throw new CopyrightError(
                        CopyrightErrorCode.VALIDATION_ERROR,
                        `Missing essential field: ${field}`,
                        { repo }
                    );
                }
            }

            // Sanitize and transform data with fallbacks
            return {
                id: String(repo.id), // Handle non-string IDs
                name: this.sanitizeString(repo.name, 'repository name'),
                type: this.determineType(repo),
                repository: this.transformRepoDetails(repo),
                license: this.transformLicense(repo.license),
                copyrightStatus: this.determineCopyrightStatus(repo),
                validationStatus: {
                    isValid: true,
                    lastValidated: new Date()
                }
            };

        } catch (error) {
            transformMetrics.errors.inc({ 
                type: error instanceof CopyrightError ? error.code : 'UNKNOWN_ERROR',
                operation: 'transformGithubData'
            });
            logger.error({ error, repoData: repo }, 'Failed to transform malformed GitHub data');
            throw error;
        }
    }

    private sanitizeString(value: unknown, fieldName: string): string {
        if (typeof value !== 'string') {
            transformMetrics.malformedData.inc({ field: fieldName, operation: 'sanitizeString' });
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                `Invalid ${fieldName}: expected string, got ${typeof value}`,
                { value }
            );
        }
        return value.trim();
    }

    private transformRepoDetails(repo: GitHubRepository): SoftwareCopyright['repository'] {
        try {
            // Handle malformed dates
            const createdAt = this.parseDate(repo.created_at, 'created_at');
            const lastUpdated = this.parseDate(repo.updated_at, 'updated_at');

            // Handle malformed numbers
            const stars = this.parseNumber(repo.stargazers_count, 'stars');

            // Handle malformed owner object
            if (!repo.owner || typeof repo.owner !== 'object' || !repo.owner.login) {
                transformMetrics.malformedData.inc({ field: 'owner', operation: 'transformRepoDetails' });
                throw new CopyrightError(
                    CopyrightErrorCode.VALIDATION_ERROR,
                    'Malformed owner data',
                    { owner: repo.owner }
                );
            }

            return {
                url: this.sanitizeString(repo.html_url, 'repository URL'),
                owner: this.sanitizeString(repo.owner.login, 'owner login'),
                name: this.sanitizeString(repo.name, 'repository name'),
                stars,
                createdAt,
                lastUpdated
            };
        } catch (error) {
            transformMetrics.malformedData.inc({ field: 'repoDetails', operation: 'transformRepoDetails' });
            throw error;
        }
    }

    private parseDate(value: unknown, fieldName: string): Date {
        try {
            if (typeof value !== 'string' || !value) {
                throw new Error('Invalid date format');
            }
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date value');
            }
            return date;
        } catch (error) {
            transformMetrics.malformedData.inc({ field: fieldName, operation: 'parseDate' });
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                `Invalid date format for ${fieldName}`,
                { value, error }
            );
        }
    }

    private parseNumber(value: unknown, fieldName: string): number {
        const num = Number(value);
        if (isNaN(num)) {
            transformMetrics.malformedData.inc({ field: fieldName, operation: 'parseNumber' });
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                `Invalid number format for ${fieldName}`,
                { value }
            );
        }
        return num;
    }

    private determineType(repo: GitHubRepository): SoftwareCopyright['type'] {
        if (repo.private) return 'PROPRIETARY';
        if (repo.license) return 'OPEN_SOURCE';
        return 'UNKNOWN';
    }

    private transformLicense(license: GitHubRepository['license']): SoftwareCopyright['license'] {
        if (!license) {
            return {
                type: 'UNKNOWN',
                permissions: [],
                limitations: []
            };
        }

        return {
            type: license.spdx_id || 'UNKNOWN',
            url: license.url || undefined,
            permissions: [], // Can be enhanced with SPDX license data.
            limitations: []  // Can be enhanced with SPDX license data.
        };
    }

    private determineCopyrightStatus(repo: GitHubRepository): SoftwareCopyright['copyrightStatus'] {
        return {
            isProtected: true, // Software is always protected by copyright. 
            creationDate: new Date(repo.created_at),
            jurisdiction: 'Worldwide', // Berne Convention
            explanation: 'Software is automatically protected by copyright upon creation'
        };
    }

    createApiResponse<T>(data: T, requestId: string): ApiResponse<T> {
        return {
            success: true,
            data,
            metadata: {
                timestamp: new Date().toISOString(),
                requestId,
                source: 'GITHUB',
                disclaimer: 'Software is automatically protected by copyright upon creation'
            }
        };
    }
}