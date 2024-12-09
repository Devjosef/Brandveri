import { Octokit } from '@octokit/rest';
import { Counter, Histogram } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';
import { copyrightCache } from '../../utils/cache';
import { CopyrightError, CopyrightErrorCode } from '../utils/copyrightError';

const logger = loggers.copyright;

/**
 * Metrics following established patterns for production monitoring.
 */
const softwareMetrics = {
    searches: new Counter({
        name: 'software_copyright_searches_total',
        help: 'Total number of software copyright searches',
        labelNames: ['source', 'status']
    }),
    latency: new Histogram({
        name: 'software_copyright_search_duration_seconds',
        help: 'Duration of software copyright searches',
        labelNames: ['source'],
        buckets: [0.1, 0.5, 1, 2, 5]
    })
};

/**
 * Initial MVP focusing on GitHub as primary source
 * Most reliable and immediate source for software verification
 * Future: Adding other sources based on actual usage and needs
 */
class CopyrightService {
    private readonly github: Octokit;

    constructor() {
        this.github = new Octokit({
            auth: process.env.GITHUB_TOKEN,
            retry: {
                enabled: true,
                retries: 3
            },
            throttle: {
                enabled: true,
                onRateLimit: (retryAfter: number) => {
                    logger.warn({ retryAfter }, 'GitHub API rate limit exceeded');
                    return true;
                }
            }
        });
    }

    /**
     * Search for software copyright information
     *
     * 1. Single source of truth initially (GitHub)
     * 2. Caching for performance and rate limit management
     * 3. Clear error handling for production stability
     */
    async searchCopyright(query: string): Promise<ApiResponse<SoftwareSearchResult>> {
        const timer = softwareMetrics.latency.startTimer({ source: 'github' });
        const cacheKey = `software:${query}`;

        try {
            // Check cache first
            const cached = await copyrightCache.get<SoftwareSearchResult>(cacheKey);
            if (cached) {
                softwareMetrics.searches.inc({ 
                    source: 'cache', 
                    status: 'hit' 
                });
                return { success: true, data: cached };
            }

            const { data } = await this.github.search.repos({
                q: query,
                per_page: 100,
                sort: 'stars'
            });

            const results = await this.enrichWithLicenseInfo(data.items);
            
            // Cache results
            await copyrightCache.set(cacheKey, results, { ttl: 3600 });

            softwareMetrics.searches.inc({ 
                source: 'github', 
                status: 'success' 
            });

            return { 
                success: true, 
                data: results,
                metadata: {
                    disclaimer: 'Results are indicative and not legal advice',
                    lastUpdated: new Date().toISOString()
                }
            };

        } catch (error) {
            softwareMetrics.searches.inc({ 
                source: 'github', 
                status: 'error' 
            });

            logger.error({ error, query }, 'Software copyright search failed');
            
            throw new CopyrightError(
                CopyrightErrorCode.SEARCH_ERROR,
                'Failed to search software copyrights',
                error
            );
        } finally {
            timer();
        }
    }

    /**
     * Enrich repository data with license information
     * Provides immediate copyright status indication
     */
    private async enrichWithLicenseInfo(repos: any[]): Promise<SoftwareSearchResult[]> {
        return Promise.all(repos.map(async repo => ({
            name: repo.full_name,
            type: repo.private ? 'PROPRIETARY' : 'OPEN_SOURCE',
            license: repo.license?.spdx_id || 'UNKNOWN',
            repository: repo.html_url,
            publisher: repo.owner.login,
            firstPublished: repo.created_at,
            matches: [{
                source: 'GITHUB',
                confidence: this.calculateConfidence(repo),
                details: `Found in GitHub with ${repo.stargazers_count} stars`
            }]
        })));
    }

    /**
     * Calculate match confidence based on repository metrics
     * Provides reliability indicator for results
     */
    private calculateConfidence(repo: any): number {
        const factors = {
            stars: Math.min(repo.stargazers_count / 1000, 1),
            age: Math.min((Date.now() - new Date(repo.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000), 1),
            hasLicense: repo.license ? 0.3 : 0
        };

        return Math.min(
            (factors.stars * 0.4) + 
            (factors.age * 0.3) + 
            factors.hasLicense,
            1
        );
    }
}
