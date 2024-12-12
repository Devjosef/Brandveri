import { Octokit } from '@octokit/rest';
import { Counter, Histogram } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';
import { copyrightCache } from '../../utils/cache';
import { CopyrightError, CopyrightErrorCode } from '../utils/copyrightError';
import { crConfig } from '../utils/crConfig';
import { 
    ApiResponse, 
    SoftwareCopyright, 
    SoftwareSearchResult,
    GitHubRepository,
    ServiceHealth,
    CopyrightMetrics
} from '../../../types/copyright';
import { CircuitBreaker } from '../../utils/circuitBreaker';
import { RequestContext } from '../../utils/requestContext';
import { validatePayloadSize, sanitizeRequest } from '../../utils/requestValidators';
import { AsyncLock } from '../../utils/AsyncLock';
import { invariant } from '../../utils/invariant';

const logger = loggers.copyright;

/**
 * Metrics for production monitoring
 */
const softwareMetrics = {
    searches: new Counter({
        name: 'software_copyright_searches_total',
        help: 'Total number of software copyright searches',
        labelNames: ['source', 'status', 'cache_hit']
    }),
    latency: new Histogram({
        name: 'software_copyright_search_duration_seconds',
        help: 'Duration of software copyright searches',
        labelNames: ['operation', 'cache_status'],
        buckets: [0.1, 0.5, 1, 2, 5]
    }),
    errors: new Counter({
        name: 'software_copyright_errors_total',
        help: 'Total number of errors in copyright service',
        labelNames: ['type', 'operation']
    })
};

class CopyrightService {
    private readonly github: Octokit;
    private readonly circuitBreaker: CircuitBreaker;
    private readonly searchLock: AsyncLock;
    private readonly githubLock: AsyncLock;

    constructor() {
        this.github = new Octokit({
            auth: crConfig.GITHUB.TOKEN,
            retry: {
                enabled: true,
                retries: crConfig.GITHUB.RETRY_ATTEMPTS
            }
        });

        this.circuitBreaker = new CircuitBreaker('github-api', {
            failureThreshold: 5,
            resetTimeout: 30000
        });

        this.searchLock = new AsyncLock();
        this.githubLock = new AsyncLock();
    }

    /**
     * Search for software copyright information
     */
    async searchCopyright(query: string): Promise<ApiResponse<SoftwareSearchResult>> {
        const context = RequestContext.getCurrentContext();
        const requestId = context?.correlationId || crypto.randomUUID();
        const timer = softwareMetrics.latency.startTimer({ operation: 'search' });

        try {
            // Input validation
            invariant(query?.length >= crConfig.SEARCH.MIN_QUERY_LENGTH, 
                'Query must be at least 3 characters long');
            validatePayloadSize(query, crConfig.VALIDATION.MAX_QUERY_SIZE);
            const sanitizedQuery = sanitizeRequest({ query }).query as string;

            return await this.searchLock.acquire('search', async () => {
                const cacheKey = `software:${sanitizedQuery}`;
                const cached = await copyrightCache.get<SoftwareSearchResult>(cacheKey);

                if (cached) {
                    softwareMetrics.searches.inc({ 
                        source: 'github', 
                        status: 'success',
                        cache_hit: 'true'
                    });
                    return this.createApiResponse(cached, requestId, 'Results from cache');
                }

                const results = await this.circuitBreaker.execute(async () => {
                    return this.githubLock.acquire('github-api', async () => {
                        const { data } = await this.github.search.repos({
                            q: sanitizedQuery,
                            per_page: crConfig.GITHUB.MAX_ITEMS_PER_SEARCH
                        });
                        return this.enrichWithCopyrightInfo(data.items);
                    });
                });

                await copyrightCache.set(cacheKey, results, crConfig.CACHE.TTL);
                softwareMetrics.searches.inc({ 
                    source: 'github', 
                    status: 'success',
                    cache_hit: 'false'
                });

                return this.createApiResponse(results, requestId);
            });

        } catch (error) {
            return this.handleError(error, {
                operation: 'searchCopyright',
                params: { query },
                requestId
            });
        } finally {
            timer();
        }
    }

    /**
     * Get repository details with copyright information
     */
    async getRepositoryDetails(
        owner: string, 
        repo: string
    ): Promise<ApiResponse<SoftwareSearchResult>> {
        const context = RequestContext.getCurrentContext();
        const requestId = context?.correlationId || crypto.randomUUID();
        const timer = softwareMetrics.latency.startTimer({ operation: 'getDetails' });

        try {
            validatePayloadSize(owner + repo, crConfig.VALIDATION.MAX_PATH_SIZE);
            const sanitizedInput = sanitizeRequest({ owner, repo });
            const sanitizedOwner = sanitizedInput.owner as string;
            const sanitizedRepo = sanitizedInput.repo as string;

            return await this.githubLock.acquire('github-api', async () => {
                const results = await this.circuitBreaker.execute(async () => {
                    const { data } = await this.github.repos.get({
                        owner: sanitizedOwner,
                        repo: sanitizedRepo
                    });
                    return this.transformGithubData(data);
                });

                return this.createApiResponse([results], requestId);
            });

        } catch (error) {
            return this.handleError(error, {
                operation: 'getRepositoryDetails',
                params: { owner, repo },
                requestId
            });
        } finally {
            timer();
        }
    }

    /**
     * Get service health status
     */
    async getServiceHealth(): Promise<ServiceHealth> {
        return {
            isHealthy: !this.circuitBreaker.isOpen(),
            lastCheck: new Date(),
            failureCount: this.circuitBreaker.getFailureCount(),
            rateLimitInfo: await this.getRateLimitInfo()
        };
    }

    /**
     * Get service metrics
     */
    getMetrics(): CopyrightMetrics {
        return {
            searchLatency: softwareMetrics.latency.get().values.sum,
            cacheHitRate: this.calculateCacheHitRate(),
            errorRate: softwareMetrics.errors.get().value,
            rateLimitRemaining: 0, // Updated by getRateLimitInfo
            totalRequests: softwareMetrics.searches.get().value,
            activeRequests: this.searchLock.getPendingCount()
        };
    }

    private async getRateLimitInfo() {
        try {
            const { data } = await this.github.rateLimit.get();
            return {
                remaining: data.rate.remaining,
                reset: new Date(data.rate.reset * 1000),
                limit: data.rate.limit
            };
        } catch (error) {
            logger.error({ error }, 'Failed to get rate limit info');
            return {
                remaining: 0,
                reset: new Date(),
                limit: 0
            };
        }
    }

    private calculateCacheHitRate(): number {
        const hits = softwareMetrics.searches.get({ cache_hit: 'true' }).value;
        const total = softwareMetrics.searches.get().value;
        return total ? hits / total : 0;
    }

    /**
     * Enrich repository data with license information,
     * Reasoning: Provides immediate copyright status indication.
     */
    private async enrichWithCopyrightInfo(repos: any[]): Promise<SoftwareSearchResult[]> {
        return Promise.all(repos.map(async repo => ({
            name: repo.full_name,
            type: this.determineType(repo),
            license: repo.license?.spdx_id || 'UNKNOWN',
            repository: repo.html_url,
            publisher: repo.owner.login,
            firstPublished: repo.created_at,
            copyrightStatus: {
                isProtected: true,
                creationDate: repo.created_at,
                jurisdiction: 'Worldwide',
                explanation: 'Software is automatically protected by copyright upon creation under the Berne Convention'
            },
            matches: [{
                source: 'GITHUB',
                confidence: this.calculateConfidence(repo),
                details: this.generateDetails(repo)
            }]
        })));
    }

    private determineType(repo: any): SoftwareSearchResult['type'] {
        if (repo.private) return 'PROPRIETARY';
        if (repo.license) return 'OPEN_SOURCE';
        return 'UNKNOWN';
    }

    private generateDetails(repo: any): string {
        const details = [
            `Found in GitHub with ${repo.stargazers_count} stars`,
            `Created on ${new Date(repo.created_at).toLocaleDateString()}`,
            repo.license 
                ? `Licensed under ${repo.license.spdx_id}` 
                : 'No explicit license (All rights reserved)'
        ];
        return details.join('. ');
    }

    private calculateSearchScore(results: SoftwareSearchResult[]): number {
        if (!results.length) return 0;
        
        return results.reduce((acc, result) => 
            acc + result.matches[0].confidence, 0) / results.length;
    }

    /**
     * Calculate match confidence based on repository metrics.
     * Reasoning: 
     * 1. Stars indicate project popularity and reliability,
     * 2. Age indicates project stability,
     * 3. License presence indicates proper copyright management.
     */
    private calculateConfidence(repo: {
        stargazers_count: number;
        created_at: string;
        license: { spdx_id: string } | null;
    }): number {
        const factors = {
            stars: Math.min(repo.stargazers_count / 1000, 1),  // Max 1000 stars for full score.
            age: Math.min(
                (Date.now() - new Date(repo.created_at).getTime()) / 
                (365 * 24 * 60 * 60 * 1000), // Convert to years.
                1
            ),
            hasLicense: repo.license ? 0.3 : 0
        };

        // Weight factors and ensure final score is between 0 and 1.
        return Math.min(
            (factors.stars * 0.4) +    // 40% weight for popularity,
            (factors.age * 0.3) +      // 30% weight for project age,
            factors.hasLicense,         // 30% weight for license presence.
            1
        );
    }

    private transformGitHubData(repo: GitHubRepository): SoftwareCopyright {
        return {
            id: repo.id.toString(),
            name: repo.full_name,
            type: repo.private ? 'PROPRIETARY' : 'OPEN_SOURCE',
            repository: {
                url: repo.html_url,
                owner: repo.owner.login,
                name: repo.name,
                stars: repo.stargazers_count,
                createdAt: new Date(repo.created_at),
                lastUpdated: new Date(repo.updated_at)
            },
            license: {
                type: repo.license?.spdx_id || 'UNKNOWN',
                url: repo.license?.url,
                permissions: [],
                limitations: []
            },
            copyrightStatus: {
                isProtected: true,
                creationDate: new Date(repo.created_at),
                jurisdiction: 'Worldwide',
                explanation: 'Software is automatically protected by copyright upon creation'
            }
        };
    }

    private createApiResponse(data: SoftwareSearchResult[], requestId: string, disclaimer?: string): ApiResponse<SoftwareSearchResult> {
        return {
            success: true,
            data: {
                matches: [{
                    ...data[0],
                    confidence: this.calculateConfidence(data[0]),
                    source: 'GITHUB',
                    details: ''
                }],
                metadata: {
                    totalCount: data.length,
                    searchScore: this.calculateConfidence(data[0]),
                    query: `${data[0].publisher}/${data[0].name}`,
                    filters: {},
                    disclaimer: disclaimer || 'Software is automatically protected by copyright upon creation',
                    timestamp: new Date().toISOString(),
                    requestId,
                    lastUpdated: new Date().toISOString()
                }
            },
            metadata: {
                timestamp: new Date().toISOString(),
                requestId,
                disclaimer: 'Software is automatically protected by copyright upon creation',
                lastUpdated: new Date().toISOString()
            }
        };
    }

    private handleError(error: Error, context: { operation: string, params: any }): ApiResponse<SoftwareSearchResult> {
        softwareMetrics.searches.inc({ 
            source: 'github', 
            status: 'error',
            license_type: 'unknown'
        });

        // Ensure error is an object before logging it.
        const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : { error };

        logger.error({ 
            error: errorDetails, 
            operation: context.operation,
            params: context.params,
            requestId: context.requestId 
        }, 'Software copyright search failed');
        
        throw new CopyrightError(
            CopyrightErrorCode.SEARCH_ERROR,
            'Failed to search software copyrights',
            errorDetails
        );
    }
}

export const copyrightService = new CopyrightService();
