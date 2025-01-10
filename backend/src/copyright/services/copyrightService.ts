import { inject, injectable } from 'inversify';
import  crypto  from 'crypto'
import { GitHubUtility } from '../utils/githubUtility';
import { CopyrightTransformer } from '../utils/copyrightTransformer';
import { CopyrightValidator } from '../utils/copyrightValidator';
import { copyrightCache } from '../../utils/cache';
import { loggers } from '../../../observability/contextLoggers';
import { CopyrightError, CopyrightErrorCode } from '../utils/copyrightError';
import { CircuitBreaker } from '../../utils/circuitBreaker';
import { customStore } from '../../../middleware/ratelimiter';
import { crConfig } from '../utils/crConfig';
import { Counter, Histogram, Gauge } from 'prom-client';
import type { 
    ApiResponse, 
    SoftwareSearchResult, 
    ServiceHealth,
    CopyrightMetrics,
    SoftwareSearchParams,
    ICopyrightService,
    GitHubRepository
} from '../../../types/copyright';


const logger = loggers.copyright;

/**
 * Production-ready Copyright Service Implementation
 * Handles software repository copyright operations with proper error handling,
 * monitoring, caching, and resource management.
 *
 * @implements {ICopyrightService}
 */
@injectable()
export class CopyrightService implements ICopyrightService {
    private readonly metrics = {
        operations: new Counter({
            name: 'copyright_operations_total',
            help: 'Total number of copyright operations',
            labelNames: ['operation', 'status', 'cache']
        }),
        errors: new Counter({
            name: 'copyright_errors_total',
            help: 'Total number of copyright errors',
            labelNames: ['operation', 'type']
        }),
        duration: new Histogram({
            name: 'copyright_operation_duration_seconds',
            help: 'Duration of copyright operations',
            labelNames: ['operation', 'cache']
        }),
        concurrent: new Gauge({
            name: 'copyright_concurrent_operations',
            help: 'Number of concurrent operations'
        })
    };
    private readonly circuitBreaker: CircuitBreaker;
    private readonly rateLimiter: typeof customStore;
    private isShuttingDown = false;

    constructor(
        @inject('GitHubUtility') private readonly github: GitHubUtility,
        @inject('CopyrightTransformer') private readonly transformer: CopyrightTransformer,
        @inject('CopyrightValidator') private readonly validator: CopyrightValidator,
        @inject('Config') private readonly config: typeof crConfig
    ) {
        this.validateDependencies();
        this.circuitBreaker = new CircuitBreaker('copyright-service', {
            failureThreshold: config.GITHUB.RETRY_ATTEMPTS,
            resetTimeout: config.GITHUB.RETRY_DELAY,
            maxConcurrent: 100,
            healthCheckInterval: 30000
        });
        this.rateLimiter = customStore;
        this.setupGracefulShutdown();
    }

    /**
     * Validates that all required dependencies are properly injected.
     * @throws {CopyrightError} If any dependency is missing
     */
    private validateDependencies(): void {
        if (!this.github) {
            throw new CopyrightError(
                CopyrightErrorCode.INITIALIZATION_ERROR,
                'GitHubUtility dependency not injected'
            );
        }
        if (!this.transformer) {
            throw new CopyrightError(
                CopyrightErrorCode.INITIALIZATION_ERROR,
                'CopyrightTransformer dependency not injected'
            );
        }
        if (!this.validator) {
            throw new CopyrightError(
                CopyrightErrorCode.INITIALIZATION_ERROR,
                'CopyrightValidator dependency not injected'
            );
        }
        if (!this.config) {
            throw new CopyrightError(
                CopyrightErrorCode.INITIALIZATION_ERROR,
                'Config dependency not injected'
            );
        }
    }

    /**
     * Searches for copyright information in software repositories
     * @throws {CopyrightError} On validation, rate limit, or service errors
     */
    async searchCopyright(
        query: string,
        params?: Partial<SoftwareSearchParams>
    ): Promise<ApiResponse<SoftwareSearchResult[]>> {
        const timer = this.metrics.duration.startTimer({ operation: 'search' });
        this.metrics.concurrent.inc();
        const requestId = crypto.randomUUID();

        try {
            await this.rateLimiter.consume('search');
            await this.checkCircuitBreaker();

            const validated = this.validator.validateSearchQuery(query, params);
            const cacheKey = this.buildCacheKey('search', validated);
            
            // Fast path: cache hit
            const cached = await this.getFromCache<SoftwareSearchResult[]>(cacheKey);
            if (cached) {
                this.metrics.operations.inc({ 
                    operation: 'search', 
                    status: 'success',
                    cache: 'hit'
                });
                return this.transformer.createApiResponse(cached, requestId);
            }

            // Slow path: API call with retry
            const repositories = await this.executeWithRetry(() => 
                this.github.search(validated.query, validated.params)
            );

            const results = await this.processSearchResults(repositories);
            await this.cacheResults(cacheKey, results);

            this.metrics.operations.inc({ 
                operation: 'search', 
                status: 'success',
                cache: 'miss'
            });
            return this.transformer.createApiResponse(results, requestId);

        } catch (error) {
            this.handleOperationError('search', error, { query, params });
            throw error;
        } finally {
            timer();
            this.metrics.concurrent.dec();
        }
    }

    /**
     * Retrieves detailed copyright information for a specific repository.
     * @throws {CopyrightError} On validation, rate limit, or service errors
     */
    async getRepositoryDetails(
        owner: string, 
        repo: string
    ): Promise<ApiResponse<SoftwareSearchResult>> {
        const timer = this.metrics.duration.startTimer({ operation: 'details' });
        this.metrics.concurrent.inc();
        const requestId = crypto.randomUUID();

        try {
            await this.rateLimiter.consume('details');
            await this.checkCircuitBreaker();

            const validated = this.validator.validateRepoParams(owner, repo);
            const cacheKey = this.buildCacheKey('repo', validated);

            const cached = await this.getFromCache<SoftwareSearchResult>(cacheKey);
            if (cached) {
                this.metrics.operations.inc({ 
                    operation: 'details', 
                    status: 'success',
                    cache: 'hit'
                });
                return this.transformer.createApiResponse(cached, requestId);
            }

            const repository = await this.executeWithRetry(() =>
                this.github.getRepository(validated.owner, validated.repo)
            );
            
            const result = await this.transformer.transformGithubData(repository);
            await this.cacheResults(cacheKey, [result]);

            this.metrics.operations.inc({ 
                operation: 'details', 
                status: 'success',
                cache: 'miss'
            });
            return this.transformer.createApiResponse(result, requestId);

        } catch (error) {
            this.handleOperationError('details', error, { owner, repo });
            throw error;
        } finally {
            timer();
            this.metrics.concurrent.dec();
        }
    }
        /**
     * Provides comprehensive service health information
     */
        async getServiceHealth(): Promise<ServiceHealth> {
            const timer = this.metrics.duration.startTimer({ operation: 'health' });
            
            try {
                const [githubHealth, cacheHealth] = await Promise.all([
                    this.github.getHealth(),
                    this.checkCacheHealth()
                ]);
    
                const isHealthy = githubHealth.status === 'healthy' && 
                                cacheHealth.status === 'healthy' &&
                                !this.isShuttingDown &&
                                !this.circuitBreaker.isOpen() &&
                                (await this.metrics.concurrent.get()).values[0].value < 100;
    
                return {
                    status: isHealthy ? 'healthy' : 'degraded',
                    timestamp: new Date().toISOString(),
                    components: {
                        github: githubHealth,
                        cache: cacheHealth,
                        circuitBreaker: {
                            status: this.circuitBreaker.isOpen() ? 'open' : 'closed',
                            failures: this.circuitBreaker.getFailureCount()
                        },
                        rateLimiter: {
                            status: 'healthy',
                            currentLoad: this.rateLimiter.getCurrentLoad()
                        }
                    },
                    metrics: this.getMetrics()
                };
            } finally {
                timer();
            }
        }
    
        /**
        * Provides comprehensive service metrics for monitoring and observability
        * @returns {CopyrightMetrics} Standardized metrics object
        */
        getMetrics(): CopyrightMetrics {
            const hitrate = this.calculateCacheHitRate();

            return Object.freeze({
                requests: Object.freeze({
                    total: 0,
                    errors: 0,
                    concurrent: 0,
                }),
                performance: Object.freeze({ 
                    averageResponseTime: 0,
                    p95ResponseTime: 0,
                    p99ResponseTime: 0
                }),
                cache: Object.freeze({
                    hitRate: 0,
                    size: 0,
                    capacity: 0
                }),
                github: Object.freeze({
                    rateLimit: Object.freeze({
                        remaining: 0,
                        reset: new Date().toISOString(),
                        limit: 0,
                        used: 0
                    }),
                    requests: Object.freeze({
                        total: 0,
                        successful: 0,
                        failed: 0
                    }),
                    latency: Object.freeze({
                        avg: 0,
                        p95: 0,
                        p99: 0
                    }),
                    cache: Object.freeze({
                        hits: 0,
                        misses: 0,
                        size: 0,
                        hitrate
                    })
                })
            });
        }
    
        /**
         * Properly disposes of service resources
         */
        async dispose(): Promise<void> {
            this.isShuttingDown = true;
            
            try {
                // Wait for ongoing operations to complete.
                await this.waitForOperationsToComplete();
                
                // Cleanup resources
                this.github.dispose();
                await copyrightCache.clear();
                this.circuitBreaker.reset();
                this.rateLimiter.reset();
                
                logger.info('Copyright service disposed successfully');
            } catch (error) {
                logger.error({ error }, 'Error during service disposal');
                throw new CopyrightError(
                    CopyrightErrorCode.SHUTDOWN_ERROR,
                    'Failed to cleanup resources'
                );
            }
        }
    
        // Private helper methods
        private async waitForOperationsToComplete(timeout = 30000): Promise<void> {
            const start = Date.now();
            while ((await this.metrics.concurrent.get()).values[0].value > 0) {
                if (Date.now() - start > timeout) {
                    throw new CopyrightError(
                        CopyrightErrorCode.SHUTDOWN_ERROR,
                        'Timeout waiting for operations to complete'
                    );
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    
        private async checkCircuitBreaker(): Promise<void> {
            if (this.circuitBreaker.isOpen()) {
                throw new CopyrightError(
                    CopyrightErrorCode.CIRCUIT_BREAKER_ERROR,
                    'Service circuit breaker is open'
                );
            }
        }
    
        private async checkCacheHealth(): Promise<{ status: string; details?: string }> {
            try {
                const testKey = `health-check-${Date.now()}`;
                await copyrightCache.set(testKey, 'test');
                await copyrightCache.get(testKey);
                await copyrightCache.del(testKey);
                return { status: 'healthy' };
            } catch (error) {
                return { 
                    status: 'degraded',
                    details: error instanceof Error ? error.message : 'Cache check failed'
                };
            }
        }
    
        private async processSearchResults(
            repositories: GitHubRepository[]
        ): Promise<SoftwareSearchResult[]> {
            return Promise.all(
                repositories.map(async (repo) => {
                    try {
                        return await this.transformer.transformGithubData(repo);
                    } catch (error) {
                        logger.warn({ error, repo }, 'Failed to transform repository');
                        this.metrics.errors.inc({ 
                            operation: 'transform',
                            type: 'data_transformation'
                        });
                        throw error;
                    }
                })
            );
        }
    
        private async handleOperationError(
            operation: string,
            error: unknown,
            context: Record<string, unknown>
        ): Promise<void> {
            this.metrics.errors.inc({ 
                operation,
                type: error instanceof CopyrightError ? error.code : 'unknown'
            });
    
            this.circuitBreaker.recordFailure();
    
            logger.error({ 
                error,
                operation,
                context,
                circuitBreakerStatus: this.circuitBreaker.isOpen() ? 'open' : 'closed',
                performance: {
                    concurrent: (await this.metrics.concurrent.get()).values[0].value,
                    responseTime: Date.now() - (context.startTime as number || 0)
                },
                timestamp: new Date().toISOString()
            }, 'Operation failed');
    
            if ((await this.metrics.concurrent.get()).values[0].value > 80) {
                logger.warn('High load detected, applying backpressure');
                throw new CopyrightError(
                    CopyrightErrorCode.RATE_LIMIT_EXCEEDED,
                    'Service is experiencing high load'
                );
            }
        }
    
        private setupGracefulShutdown(): void {
            process.on('SIGTERM', async () => {
                logger.info('Received SIGTERM, initiating graceful shutdown');
                await this.dispose();
                process.exit(0);
            });
        }
    
        /**
 * Calculates the cache hit rate from metrics
 * @returns {number} Hit rate as a percentage (0-1)
 */
private async calculateCacheHitRate(): Promise<number> {
    try {
        const hitMetrics = await this.metrics.operations.get();  
        const totalMetrics = await this.metrics.operations.get(); 

        const hits = hitMetrics.values[0]?.value ?? 0;
        const total = totalMetrics.values[0]?.value ?? 0;

        return total > 0 ? hits / total : 0;
    } catch (error) {
        logger.warn({ error }, 'Failed to calculate cache hit rate');
        return 0;
    }
}
    
        private buildCacheKey(operation: string, params: Record<string, unknown>): string {
            return `copyright:${operation}:${JSON.stringify(params)}`;
        }
    
        private async executeWithRetry<T>(
            operation: () => Promise<T>
        ): Promise<T> {
            let lastError: Error | undefined;
    
            for (let attempt = 1; attempt <= this.config.GITHUB.RETRY_ATTEMPTS; attempt++) {
                try {
                    return await operation();
                } catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    
                    if (attempt === this.config.GITHUB.RETRY_ATTEMPTS) {
                        throw lastError;
                    }
    
                    const backoffTime = Math.min(
                        1000 * Math.pow(2, attempt - 1),
                        this.config.GITHUB.RETRY_DELAY
                    );
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                }
            }
    
            throw lastError;
        }

        /**
         * Retrieves data from cache
         * @param key Cache key
         * @returns Cached data or null if not found
         */
        private async getFromCache<T>(key: string): Promise<T | null> {
            try {
                const cached = await copyrightCache.get<T>(key);
                if (cached) {
                    this.metrics.operations.inc({ 
                        operation: 'cache',
                        status: 'hit',
                        cache: 'hit'
                    });
                    return cached;
                }
                return null;
            } catch (error) {
                logger.warn({ error, key }, 'Cache retrieval failed');
                return null;
            }
        }

        /**
         * Stores data in cache
         * @param key Cache key
         * @param data Data to cache
         */
        private async setInCache<T>(key: string, data: T): Promise<void> {
            try {
                await copyrightCache.set(key, data);
                this.metrics.operations.inc({ 
                    operation: 'cache',
                    status: 'success',
                    cache: 'miss'
                });
            } catch (error) {
                logger.warn({ error, key }, 'Cache storage failed');
            }
        }

        /**
         * Stores search results in cache
         * @param key Cache key
         * @param results Search results to cache
         */
        private async cacheResults(
            key: string, 
            results: SoftwareSearchResult[]
        ): Promise<void> {
            try {
                await this.setInCache(key, results);
                this.metrics.operations.inc({ 
                    operation: 'cache',
                    status: 'success',
                    cache: 'write'
                });
            } catch (error) {
                logger.warn({ 
                    error, 
                    key,
                    resultsCount: results.length 
                }, 'Failed to cache search results');
                
                // Don't throw - caching errors shouldn't affect the main flow.
                this.metrics.errors.inc({ 
                    operation: 'cache',
                    type: 'write_error'
                });
            }
        }
    }