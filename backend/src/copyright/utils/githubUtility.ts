import { inject, injectable } from 'inversify';
import axios, { AxiosInstance, AxiosError, AxiosResponseHeaders } from "axios";
import { CircuitBreaker } from '../../utils/circuitBreaker';
import { Counter, Histogram, Gauge } from 'prom-client';
import { LRUCache } from 'lru-cache';
import { loggers } from '../../../observability/contextLoggers';
import { 
    GitHubConfig, 
    GitHubUtilityInterface,
    GitHubRepository,
    GitHubContent,
    GitHubRateLimit,
    GitHubServiceHealth,
    GitHubMetrics,
    GitHubSearchOptions,
    GitHubErrorType,
    GitHubError
} from '../../../types/github';
import { CopyrightError, CopyrightErrorCode } from '../utils/copyrightError';
import { sanitizeRequest } from '../../utils/requestValidators';

const logger = loggers.copyright;

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

// interface for search input with proper type safety
interface SearchInput {
    query: string;
    options?: GitHubSearchOptions;
}

@injectable()
export class GitHubUtility implements GitHubUtilityInterface {
    private readonly client: AxiosInstance;
    private readonly circuitBreaker: CircuitBreaker;
    private readonly cache: LRUCache<string, CacheEntry<GitHubRepository[] | GitHubRepository | GitHubContent>>;
    private readonly cacheMonitorInterval: NodeJS.Timeout;

    private readonly metrics = {
        operations: new Counter({
            name: 'github_operations_total',
            help: 'Total GitHub API operations',
            labelNames: ['operation', 'status', 'cache']
        }),
        errors: new Counter({
            name: 'github_errors_total',
            help: 'Total GitHub API errors',
            labelNames: ['operation', 'type']
        }),
        duration: new Histogram({
            name: 'github_operation_duration_seconds',
            help: 'GitHub API operation duration',
            labelNames: ['operation', 'cache']
        }),
        rateLimit: new Gauge({
            name: 'github_rate_limit_remaining',
            help: 'GitHub API rate limit remaining'
        })
    };

    private readonly performanceMetrics = {
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
        latency: {
            avg: 0,
            p95: 0,
            p99: 0
        }
    };

    constructor(
        @inject('GitHubConfig') private readonly config: GitHubConfig
    ) {
        this.validateConfig(config);
        this.client = this.initializeClient();
        this.circuitBreaker = this.initializeCircuitBreaker();
        this.cache = this.initializeCache();
        this.cacheMonitorInterval = this.initializeCacheMonitoring();
        logger.info('GitHubUtility initialized successfully');
    }

    async search(
        query: string, 
        options?: GitHubSearchOptions
    ): Promise<GitHubRepository[]> {
        const timer = this.metrics.duration.startTimer({ operation: 'search' });
        
        try {
            // First sanitize the input
            const sanitizedData = sanitizeRequest({
                query,
                options
            });

            // Validate the sanitized data
            if (!this.isValidSearchInput(sanitizedData)) {
                throw new CopyrightError(
                    CopyrightErrorCode.VALIDATION_ERROR,
                    'Invalid search parameters'
                );
            }

            const searchInput: SearchInput = {
                query: sanitizedData.query as string,
                options: sanitizedData.options || undefined
            };

            const cacheKey = this.buildCacheKey('search', { 
                query: searchInput.query,
                ...searchInput.options 
            });
            
            const cached = this.getFromCache<GitHubRepository[]>(cacheKey);
            if (cached) {
                this.metrics.operations.inc({ operation: 'search', status: 'success', cache: 'hit' });
                return cached;
            }

            const result = await this.circuitBreaker.execute(() =>
                this.makeApiCall<GitHubRepository[]>(
                    `search/repositories?q=${encodeURIComponent(searchInput.query)}`
                )
            );

            this.setCache(cacheKey, result);
            this.metrics.operations.inc({ operation: 'search', status: 'success', cache: 'miss' });
            
            return result;
        } catch (error) {
            this.handleError('search', error);
            throw error;
        } finally {
            timer();
        }
    }

    // Type guard for validating the input data
    private isValidSearchInput(data: unknown): boolean {
        if (!data || typeof data !== 'object') {
            return false;
        }

        const input = data as Record<string, unknown>;
        
        if (typeof input.query !== 'string' || !input.query) {
            return false;
        }

        if (input.options !== undefined && 
            (typeof input.options !== 'object' || input.options === null)) {
            return false;
        }

        return true;
    }

    async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
        const timer = this.metrics.duration.startTimer({ operation: 'getRepository' });

        try {
            const sanitizedInput = sanitizeRequest({ owner, repo });
            const cacheKey = this.buildCacheKey('repository', sanitizedInput);

            const cached = this.getFromCache<GitHubRepository>(cacheKey);
            if (cached) {
                this.metrics.operations.inc({ operation: 'getRepository', status: 'success', cache: 'hit' });
                return cached;
            }

            const result = await this.circuitBreaker.execute(() =>
                this.makeApiCall<GitHubRepository>(`repos/${sanitizedInput.owner}/${sanitizedInput.repo}`)
            );

            this.setCache(cacheKey, result);
            this.metrics.operations.inc({ operation: 'getRepository', status: 'success', cache: 'miss' });

            return result;
        } catch (error) {
            this.handleError('getRepository', error);
            throw error;
        } finally {
            timer();
        }
    }

    async getContent(owner: string, repo: string, path: string): Promise<GitHubContent> {
        const timer = this.metrics.duration.startTimer({ operation: 'getContent' });

        try {
            const sanitizedInput = sanitizeRequest({ owner, repo, path });
            const cacheKey = this.buildCacheKey('content', sanitizedInput);

            const cached = this.getFromCache<GitHubContent>(cacheKey);
            if (cached) {
                this.metrics.operations.inc({ operation: 'getContent', status: 'success', cache: 'hit' });
                return cached;
            }

            const result = await this.circuitBreaker.execute(() =>
                this.makeApiCall<GitHubContent>(
                    `repos/${sanitizedInput.owner}/${sanitizedInput.repo}/contents/${sanitizedInput.path}`
                )
            );

            this.setCache(cacheKey, result);
            this.metrics.operations.inc({ operation: 'getContent', status: 'success', cache: 'miss' });

            return result;
        } catch (error) {
            this.handleError('getContent', error);
            throw error;
        } finally {
            timer();
        }
    }

    async getRateLimit(): Promise<GitHubRateLimit> {
        try {
            const result = await this.makeApiCall<{ resources: { core: GitHubRateLimit } }>('rate_limit');
            return result.resources.core;
        } catch (error) {
            this.handleError('getRateLimit', error);
            throw error;
        }
    }

    async getHealth(): Promise<GitHubServiceHealth> {
        try {
            const rateLimit = await this.getRateLimit();
            const isHealthy = this.circuitBreaker.isClosed() && rateLimit.remaining > 0;

            return {
                isHealthy,
                lastCheck: new Date(),
                failureCount: this.circuitBreaker.getFailureCount(),
                rateLimitInfo: rateLimit
            };
        } catch (error) {
            logger.error({ error }, 'Health check failed');
            return {
                isHealthy: false,
                lastCheck: new Date(),
                failureCount: this.circuitBreaker.getFailureCount(),
                rateLimitInfo: {
                    limit: 0,
                    remaining: 0,
                    reset: 0,
                    used: 0
                }
            };
        }
    }

    getMetrics(): GitHubMetrics {
        return {
            requests: {
                total: this.performanceMetrics.requestCount,
                successful: this.performanceMetrics.successCount,
                failed: this.performanceMetrics.failureCount
            },
            rateLimit: {
                limit: Number(this.metrics.rateLimit.get()),
                remaining: Number(this.metrics.rateLimit.get()),
                reset: Math.floor(Date.now() / 1000) + 3600,
                used: this.performanceMetrics.requestCount
            },
            latency: this.performanceMetrics.latency,
            cache: {
                hits: this.performanceMetrics.cacheHits,
                misses: this.performanceMetrics.cacheMisses,
                size: this.cache.size
            }
        };
    }

    private async makeApiCall<T>(path: string): Promise<T> {
        try {
            const response = await this.client.get<T>(path);
            this.updateRateLimitMetrics(response.headers as AxiosResponseHeaders);
            return response.data;
        } catch (error) {
            throw this.transformError(error as AxiosError);
        }
    }

    private handleError(operation: string, error: unknown): void {
        this.performanceMetrics.failureCount++;
        
        const errorType = error instanceof CopyrightError 
            ? error.code 
            : error instanceof AxiosError 
                ? this.determineErrorType(error)
                : GitHubErrorType.UNKNOWN;

        this.metrics.errors.inc({ 
            operation, 
            type: errorType
        });
        
        if (error instanceof AxiosError) {
            this.handleAxiosError(error);
        }

        logger.error({
            operation,
            errorType,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, 'GitHub operation failed');
    }

    private handleAxiosError(error: AxiosError): void {
        if (error.response?.status === 429) {
            const resetTime = parseInt(error.response.headers['x-ratelimit-reset'] as string, 10);
            logger.warn({
                resetTime: new Date(resetTime * 1000),
                remaining: parseInt(error.response.headers['x-ratelimit-remaining'] as string, 10)
            }, 'Rate limit exceeded');
        }
    }

    private transformError(error: AxiosError): CopyrightError {
        const githubError: GitHubError = {
            type: this.determineErrorType(error),
            status: error.response?.status,
            message: error.message,
            context: 'GitHub API',
            data: error.response?.data
        };

        switch (githubError.type) {
            case GitHubErrorType.RATE_LIMIT:
                return new CopyrightError(
                    CopyrightErrorCode.RATE_LIMIT_ERROR,
                    'GitHub API rate limit exceeded'
                );
            
            case GitHubErrorType.NOT_FOUND:
                return new CopyrightError(
                    CopyrightErrorCode.NOT_FOUND,
                    'GitHub resource not found'
                );
            
            case GitHubErrorType.UNAUTHORIZED:
                return new CopyrightError(
                    CopyrightErrorCode.GITHUB_API_ERROR,
                    'GitHub API authentication failed'
                );
            
            case GitHubErrorType.NETWORK:
                return new CopyrightError(
                    CopyrightErrorCode.GITHUB_API_ERROR,
                    'Network error while accessing GitHub API'
                );
            
            case GitHubErrorType.VALIDATION:
                return new CopyrightError(
                    CopyrightErrorCode.VALIDATION_ERROR,
                    'Invalid GitHub API request'
                );
            
            default:
                return new CopyrightError(
                    CopyrightErrorCode.GITHUB_API_ERROR,
                    'GitHub API request failed'
                );
        }
    }

    private determineErrorType(error: AxiosError): GitHubErrorType {
        if (!error.response) {
            return GitHubErrorType.NETWORK;
        }

        switch (error.response.status) {
            case 429:
                return GitHubErrorType.RATE_LIMIT;
            case 404:
                return GitHubErrorType.NOT_FOUND;
            case 401:
                return GitHubErrorType.UNAUTHORIZED;
            case 400:
                return GitHubErrorType.VALIDATION;
            default:
                return GitHubErrorType.UNKNOWN;
        }
    }

    private initializeClient(): AxiosInstance {
        return axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout || 10000,
            headers: {
                Authorization: `Bearer ${this.config.token}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
    }

    private initializeCircuitBreaker(): CircuitBreaker {
        return new CircuitBreaker('github-api', {
            failureThreshold: this.config.retry.attempts,
            resetTimeout: 30000
        });
    }

    private initializeCache(): LRUCache<string, CacheEntry<GitHubRepository[] | GitHubRepository | GitHubContent>> {
        return new LRUCache({
            max: 500,
            ttl: 1000 * 60 * 5, // 5 minutes
            updateAgeOnGet: true
        });
    }

    private initializeCacheMonitoring(): NodeJS.Timeout {
        return setInterval(() => {
            this.updateCacheMetrics();
        }, 60000) as NodeJS.Timeout;
    }

    private updateCacheMetrics(): void {
        const size = this.cache.size;
        logger.debug({ size }, 'Cache size updated');
    }

    private updateRateLimitMetrics(headers: AxiosResponseHeaders): void {
        const remaining = parseInt(headers['x-ratelimit-remaining'] as string, 10);
        if (!isNaN(remaining)) {
            this.metrics.rateLimit.set(remaining);
        }
    }

    private validateConfig(config: GitHubConfig): void {
        if (!config.token) {
            throw new CopyrightError(
                CopyrightErrorCode.INITIALIZATION_ERROR,
                'GitHub token is required'
            );
        }
        if (!config.baseUrl) {
            throw new CopyrightError(
                CopyrightErrorCode.INITIALIZATION_ERROR,
                'GitHub base URL is required'
            );
        }
    }

    private buildCacheKey(operation: string, params: Record<string, unknown>): string {
        return `github:${operation}:${JSON.stringify(params)}`;
    }

    private getFromCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (entry && entry.expiresAt > Date.now()) {
            this.performanceMetrics.cacheHits++;
            return entry.data as T;
        }
        this.performanceMetrics.cacheMisses++;
        return null;
    }

    private setCache<T extends GitHubRepository[] | GitHubRepository | GitHubContent>(
        key: string, 
        data: T
    ): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + (this.config.cache?.ttl || 300000)
        });
    }

    public dispose(): void {
        clearInterval(this.cacheMonitorInterval);
        this.cache.clear();
        logger.info('GitHubUtility disposed successfully');
    }
}