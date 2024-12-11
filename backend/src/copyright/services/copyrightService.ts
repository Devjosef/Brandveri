import { Octokit } from '@octokit/rest';
import { Counter, Histogram } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';
import { copyrightCache } from '../../utils/cache';
import { CopyrightError, CopyrightErrorCode } from '../utils/copyrightError';
import { crConfig } from '../utils/crConfig';
import { ApiResponse, SoftwareCopyright } from '../../../types/copyright';
import { GitHubRepository} from '../../../types/copyright.d';

const logger = loggers.copyright;

interface SoftwareSearchResult {
    name: string;
    type: 'PROPRIETARY' | 'OPEN_SOURCE' | 'UNKNOWN';
    license: string;
    repository: string;
    publisher: string;
    firstPublished: string;
    copyrightStatus: {
        isProtected: boolean;
        creationDate: string;
        jurisdiction: string;
        explanation: string;
    };
    matches: {
        source: 'GITHUB';
        confidence: number;
        details: string;
    }[];
}

/**
 * Metrics for production monitoring
 * Reasoning: Track API usage, performance, and error rates
 */
const softwareMetrics = {
    searches: new Counter({
        name: 'software_copyright_searches_total',
        help: 'Total number of software copyright searches',
        labelNames: ['source', 'status', 'license_type']
    }),
    latency: new Histogram({
        name: 'software_copyright_search_duration_seconds',
        help: 'Duration of software copyright searches',
        labelNames: ['source', 'cache_status'],
        buckets: [0.1, 0.5, 1, 2, 5]
    })
};

class CopyrightService {
    private readonly github: Octokit;

    constructor() {
        this.github = new Octokit({
            auth: crConfig.GITHUB.TOKEN,
            retry: {
                enabled: true,
                retries: crConfig.GITHUB.RETRY_ATTEMPTS
            },
            throttle: {
                enabled: true,
                onRateLimit: (retryAfter: number) => {
                    logger.warn({ retryAfter }, 'GitHub API rate limit exceeded');
                    return retryAfter < 60;
                }
            }
        });
    }

    /**
     * Search for software copyright information
     * Reasoning:
     * 1. GitHub as a primary source for open-source software
     * 2. Caching to optimize performance and manage rate limits
     * 3. Detailed logging for monitoring and debugging
     */
    async searchCopyright(query: string): Promise<ApiResponse<SoftwareSearchResult[]>> {
        const timer = softwareMetrics.latency.startTimer();
        const requestId = crypto.randomUUID(); // Generate unique request ID

        try {
            const cacheKey = `software:${query}`;
            const cached = await copyrightCache.get<SoftwareSearchResult[]>(cacheKey);

            if (cached) {
                softwareMetrics.searches.inc({ 
                    source: 'cache', 
                    status: 'hit',
                    license_type: 'any'
                });
                return { 
                    success: true, 
                    data: cached,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        requestId,
                        disclaimer: 'Results from cache. Software is automatically protected by copyright upon creation',
                        lastUpdated: new Date().toISOString(),
                    }
                };
            }

            const { data } = await this.github.search.repos({
                q: query,
                per_page: crConfig.GITHUB.MAX_ITEMS_PER_SEARCH,
                sort: 'stars'
            });

            const results = await this.enrichWithCopyrightInfo(data.items);
            
            // Cache results with TTL in seconds
            await copyrightCache.set(
                cacheKey, 
                results, 
                crConfig.CACHE.TTL  // Time-to-live in seconds
            );

            return { 
                success: true, 
                data: results,
                metadata: {
                    timestamp: new Date().toISOString(),
                    requestId,
                    disclaimer: 'Software is automatically protected by copyright upon creation. License type indicates usage rights, not copyright status.',
                    lastUpdated: new Date().toISOString(),
                    totalCount: data.total_count,
                    searchScore: this.calculateSearchScore(results)
                }
            };

        } catch (error) {
            softwareMetrics.searches.inc({ 
                source: 'github', 
                status: 'error',
                license_type: 'unknown'
            });

            // Ensure error is an object before logging it.
            const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : { error };

            logger.error({ 
                error: errorDetails, 
                query,
                requestId 
            }, 'Software copyright search failed');
            
            throw new CopyrightError(
                CopyrightErrorCode.SEARCH_ERROR,
                'Failed to search software copyrights',
                errorDetails
            );
        } finally {
            timer({ source: 'github', cache_status: 'miss' });
        }
    }

    /**
     * Enrich repository data with license information
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
     * Calculate match confidence based on repository metrics
     * Reasoning: 
     * 1. Stars indicate project popularity and reliability
     * 2. Age indicates project stability
     * 3. License presence indicates proper copyright management
     */
    private calculateConfidence(repo: {
        stargazers_count: number;
        created_at: string;
        license: { spdx_id: string } | null;
    }): number {
        const factors = {
            stars: Math.min(repo.stargazers_count / 1000, 1),  // Max 1000 stars for full score
            age: Math.min(
                (Date.now() - new Date(repo.created_at).getTime()) / 
                (365 * 24 * 60 * 60 * 1000), // Convert to years
                1
            ),
            hasLicense: repo.license ? 0.3 : 0
        };

        // Weight factors and ensure final score is between 0 and 1.
        return Math.min(
            (factors.stars * 0.4) +    // 40% weight for popularity
            (factors.age * 0.3) +      // 30% weight for project age
            factors.hasLicense,         // 30% weight for license presence
            1
        );
    }

    /**
     * Get repository details
     * Reasoning: Extend existing service with repository details without breaking current functionality
     */
    async getRepositoryDetails(
        owner: string, 
        repo: string
    ): Promise<ApiResponse<SoftwareSearchResult>> {
        const requestId = crypto.randomUUID();

        try {
            const { data } = await this.github.repos.get({
                owner,
                repo
            });
            // Transform GitHub data to our format
            const transformedData = this.transformGitHubData({
                ...data,
                license: data.license ? {
                    key: data.license.key,
                    name: data.license.name,
                    spdx_id: data.license.spdx_id || '',
                    url: data.license.url || ''
                } : null
            });

            return {
                success: true,
                data: {
                    matches: [{
                        ...transformedData,
                        confidence: this.calculateConfidence({
                            stargazers_count: data.stargazers_count,
                            created_at: data.created_at,
                            license: data.license ? { spdx_id: data.license.spdx_id || '' } : null
                        }),
                        source: 'GITHUB',
                        details: ''
                    }],
                    metadata: {
                        totalCount: 1,
                        searchScore: this.calculateConfidence({
                            stargazers_count: data.stargazers_count,
                            created_at: data.created_at,
                            license: data.license ? { spdx_id: data.license.spdx_id || '' } : null
                        }),
                        query: `${owner}/${repo}`,
                        filters: {},
                        disclaimer: 'Software is automatically protected by copyright upon creation',
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
        } catch (error) {
            logger.error({ 
                error,
                owner,
                repo,
                requestId 
            }, 'Failed to get repository details');

            throw new CopyrightError(
                CopyrightErrorCode.GITHUB_API_ERROR,
                'Failed to fetch repository details',
                { owner, repo }
            );
        }
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
}

export const copyrightService = new CopyrightService();
