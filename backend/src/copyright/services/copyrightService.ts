import { inject, injectable } from 'inversify';
import { GitHubUtility } from '../utils/githubUtility';
import { CopyrightTransformer } from '../utils/copyrightTransformer';
import { CopyrightValidator } from '../utils/copyrightValidator';
import { copyrightCache } from '../../utils/cache';
import { RequestContext } from '../../utils/requestContext';
import { loggers } from '../../../observability/contextLoggers';
import { CopyrightError, CopyrightErrorCode } from '../utils/copyrightError';
import { CircuitBreaker } from '../../utils/circuitBreaker';
import { sensitiveOpsLimiter } from '../../../middleware/ratelimiter';
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
import type { GitHubConfig } from '../../../types/github';

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
    private readonly rateLimiter: RateLimiter;
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
            resetTimeout: config.GITHUB.RETRY_DELAY
        });
        this.rateLimiter = new RateLimiter({
            maxRequests: config.SEARCH.MAX_CONCURRENT_SEARCHES,
            perMilliseconds: 1000
        });
        this.setupGracefulShutdown();
    }

    /**
     * Searches for copyright information in software repositories
     * @throws {CopyrightError} On validation, rate limit, or service errors
     */
    async searchCopyright(
        query: string,
        params?: Partial<SoftwareSearchParams>
    ): Promise<ApiResponse<SoftwareSearchResult>> {
        const context = this.initializeRequestContext();
        const timer = this.metrics.duration.startTimer({ operation: 'search' });
        this.metrics.concurrent.inc();

        try {
            await this.rateLimiter.acquire();
            await this.checkCircuitBreaker();

            const validated = this.validator.validateSearchQuery(query, params);
            const cacheKey = this.buildCacheKey('search', validated);
            
            // Fast path: cache hit
            const cached = await this.getFromCache<SoftwareSearchResult>(cacheKey);
            if (cached) {
                this.metrics.operations.inc({ 
                    operation: 'search', 
                    status: 'success',
                    cache: 'hit'
                });
                return this.transformer.createApiResponse(cached, context.requestId);
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
            return this.transformer.createApiResponse(results, context.requestId);

        } catch (error) {
            this.handleOperationError('search', error, { query, params });
            throw error;
        } finally {
            timer();
            this.metrics.concurrent.dec();
            this.rateLimiter.release();
        }
    }

    /**
     * Retrieves detailed copyright information for a specific repository
     * @throws {CopyrightError} On validation, rate limit, or service errors
     */
    async getRepositoryDetails(
        owner: string, 
        repo: string
    ): Promise<ApiResponse<SoftwareSearchResult>> {
        const context = this.initializeRequestContext();
        const timer = this.metrics.duration.startTimer({ operation: 'details' });
        this.metrics.concurrent.inc();

        try {
            await this.rateLimiter.acquire();
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
                return this.transformer.createApiResponse(cached, context.requestId);
            }

            const repository = await this.executeWithRetry(() =>
                this.github.getRepository(validated.owner, validated.repo)
            );
            
            const result = this.transformer.transformGithubData(repository);
            await this.cacheResults(cacheKey, [result]);

            this.metrics.operations.inc({ 
                operation: 'details', 
                status: 'success',
                cache: 'miss'
            });
            return this.transformer.createApiResponse([result], context.requestId);

        } catch (error) {
            this.handleOperationError('details', error, { owner, repo });
            throw error;
        } finally {
            timer();
            this.metrics.concurrent.dec();
            this.rateLimiter.release();
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
                                !this.circuitBreaker.isOpen();
    
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
         * Provides service metrics for monitoring
         */
        getMetrics(): CopyrightMetrics {
            return {
                requests: {
                    total: this.metrics.operations.get(),
                    errors: this.metrics.errors.get(),
                    concurrent: this.metrics.concurrent.get()
                },
                performance: {
                    averageResponseTime: this.metrics.duration.get().mean,
                    p95ResponseTime: this.metrics.duration.get().p95,
                    p99ResponseTime: this.metrics.duration.get().p99
                },
                cache: {
                    hitRate: this.calculateCacheHitRate(),
                    size: copyrightCache.size,
                    capacity: copyrightCache.max
                },
                github: this.github.getMetrics()
            };
        }
    
        /**
         * Properly disposes of service resources
         */
        async dispose(): Promise<void> {
            this.isShuttingDown = true;
            
            try {
                // Wait for ongoing operations to complete
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
            while (this.metrics.concurrent.get() > 0) {
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
    
        private handleOperationError(
            operation: string,
            error: unknown,
            context: Record<string, unknown>
        ): void {
            this.metrics.errors.inc({ 
                operation,
                type: error instanceof CopyrightError ? error.code : 'unknown'
            });
    
            this.circuitBreaker.recordFailure();
    
            logger.error({ 
                error,
                operation,
                context,
                circuitBreakerStatus: this.circuitBreaker.isOpen() ? 'open' : 'closed'
            }, 'Operation failed');
        }
    
        private setupGracefulShutdown(): void {
            process.on('SIGTERM', async () => {
                logger.info('Received SIGTERM, initiating graceful shutdown');
                await this.dispose();
                process.exit(0);
            });
        }
    
        private calculateCacheHitRate(): number {
            const hits = this.metrics.operations.get({ cache: 'hit' });
            const total = this.metrics.operations.get();
            return total > 0 ? hits / total : 0;
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
    }