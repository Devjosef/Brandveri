import { z } from 'zod';
import { CopyrightError, CopyrightErrorCode } from './copyrightError';
import { loggers } from '../../../observability/contextLoggers';
import { GitHubRepository } from '../../../types/github';

const logger = loggers.copyright;

// Pre-compiled schema for performance
const githubSchema = z.object({
    id: z.number().positive('Repository ID must be positive'),
    name: z.string().min(1, 'Repository name is required'),
    owner: z.object({
        login: z.string().min(1, 'Owner login is required'),
        id: z.number().positive('Owner ID must be positive')
    }),
    private: z.boolean(),
    html_url: z.string().url('Invalid repository URL'),
    description: z.string().nullable(),
    created_at: z.string().datetime('Invalid creation date'),
    updated_at: z.string().datetime('Invalid update date'),
    pushed_at: z.string().datetime('Invalid push date'),
    stargazers_count: z.number().min(0, 'Stars count cannot be negative'),
    license: z.object({
        key: z.string(),
        name: z.string(),
        spdx_id: z.string(),
        url: z.string().url()
    }).nullable()
}).strict();

export interface IValidator<T> {
    validate(data: unknown): asserts data is T;
}

export class GitHubValidator implements IValidator<GitHubRepository> {
    /**
     * Validates GitHub repository data structure
     */
    public validate(data: unknown): asserts data is GitHubRepository {
        try {
            githubSchema.parse(data);
            this.validateBusinessRules(data as GitHubRepository);
        } catch (error) {
            logger.error({ error, data }, 'GitHub repository validation failed');
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Invalid GitHub repository data',
                { error }
            );
        }
    }

    /**
     * Validates business rules that can't be expressed in the schema
     */
    private validateBusinessRules(repo: GitHubRepository): void {
        this.validateDates(repo);
        this.validateUrls(repo);
    }

    /**
     * Validates chronological order of dates
     */
    private validateDates(repo: GitHubRepository): void {
        const createdAt = new Date(repo.created_at);
        const updatedAt = new Date(repo.updated_at);
        const pushedAt = new Date(repo.pushed_at);

        if (updatedAt < createdAt) {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Updated date cannot be before creation date'
            );
        }

        if (pushedAt < createdAt) {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Push date cannot be before creation date'
            );
        }
    }

    /**
     * Validates URL formats and accessibility
     */
    private validateUrls(repo: GitHubRepository): void {
        try {
            new URL(repo.html_url);
            if (repo.license?.url) {
                new URL(repo.license.url);
            }
        } catch {
            throw new CopyrightError(
                CopyrightErrorCode.VALIDATION_ERROR,
                'Invalid URL format in repository data'
            );
        }
    }
}