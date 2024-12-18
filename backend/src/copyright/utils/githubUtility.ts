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
    GitHubSearchOptions
} from '../../../types/github';
import { sanitizeRequest } from '../../utils/requestValidators';

const logger = loggers.copyright;

enum GitHubErrorType {
    RATE_LIMIT = 'RATE_LIMIT',
    NOT_FOUND = 'NOT_FOUND',
    UNAUTHORIZED = 'UNAUTHORIZED',
    UNKNOWN = 'UNKNOWN'
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

type GitHubCacheData = GitHubRepository | GitHubContent | GitHubRateLimit;
type GitHubApiResponse<T> = T extends GitHubRateLimit 
    ? { resources: { core: T } }
    : T;

export class GitHubUtility implements GitHubUtilityInterface {
    [x: string]: any;
    private client!: AxiosInstance;
    private circuitBreaker!: CircuitBreaker;
    private cache!: LRUCache<string, CacheEntry<GitHubCacheData>>;
    private cacheMonitorInterval?: NodeJS.Timeout;
    private requestCount = 0;
    private successCount = 0;
    private failureCount = 0;
    private cacheHits = 0;
    private cacheMisses = 0;
    private readonly metrics = {
        requests: new Counter({
            name: 'github_requests_total',
            help: 'Total GitHub API requests',
            labelNames: ['method', 'status']
        }),
        errors: new Counter({
            name: 'github_errors_total',
            help: 'Total GitHub API errors',
            labelNames: ['type']
        }),
        duration: new Histogram({
            name: 'github_request_duration_seconds',
            help: 'GitHub API request duration',
            labelNames: ['method']
        }),
        rateLimit: new Gauge({
            name: 'github_rate_limit_remaining',
            help: 'GitHub API rate limit remaining'
        }),
        cacheSize: new Gauge({
            name: 'github_cache_size_bytes',
            help: 'GitHub cache size in bytes'
        })
    };
    private latencyValues: { avg: number; p95: number; p99: number } = {
        avg: 0,
        p95: 0,
        p99: 0
    };

    constructor(config: GitHubConfig) {
        this.validateConfig(config);
        this.initializeClient(config);
        this.initializeCircuitBreaker(config);
        this.initializeCache();
        this.initializeCacheMonitoring();
        logger.info('GitHubUtility initialized successfully');
    }

    public dispose(): void {
        if (this.cacheMonitorInterval) {
            clearInterval(this.cacheMonitorInterval);
            this.cacheMonitorInterval = undefined;
        }
        logger.info('GitHubUtility disposed successfully');
    }

    search(_query: string, _options?: GitHubSearchOptions): Promise<GitHubRepository[]> {
        throw new Error("Method not implemented.");
    }

    async getHealth(): Promise<GitHubServiceHealth> {
        try {
            const rateLimit = await this.getRateLimit();
            return {
                isHealthy: true,
                lastCheck: new Date(),
                failureCount: 0,
                rateLimitInfo: rateLimit
            };
        } catch (error) {
            logger.error({ error }, 'Health check failed');
            return {
                isHealthy: false,
                lastCheck: new Date(),
                failureCount: 1,
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
                total: this.requestCount,
                successful: this.successCount,
                failed: this.failureCount
            },
            rateLimit: {
                limit: 5000,
                remaining: Number(this.metrics.rateLimit.get()),
                reset: Math.floor(Date.now() / 1000) + 3600,
                used: 5000 - Number(this.metrics.rateLimit.get())
            },
            latency: this.latencyValues,
            cache: {
                hits: this.cacheHits,
                misses: this.cacheMisses,
                size: this.calculateCacheSize()
            }
        };
    }

    private updateLatencyMetrics(): void {
        this.metrics.duration.get().then((histogram: any) => {
            this.latencyValues = {
                avg: histogram.values['avg'] || 0,
                p95: histogram.values['0.95'] ? Number(histogram.values['0.95']) : 0,
                p99: histogram.values['0.99'] ? Number(histogram.values['0.99']) : 0
            };
        }).catch((error: any) => {
            logger.error({ error }, 'Failed to update latency metrics');
        });
    }

    private updateMetricCounters(success: boolean): void {
        this.requestCount++;
        if (success) {
            this.successCount++;
        } else {
            this.failureCount++;
        }
    }

    async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
        return this.fetchFromApi<GitHubRepository>(
            `repos/${owner}/${repo}`,
            'getRepository',
            { owner, repo }
        );
    }

    async getContent(owner: string, repo: string, path: string): Promise<GitHubContent> {
        return this.fetchRepoContent(owner, repo, path);
    }

    async getRateLimit(): Promise<GitHubRateLimit> {
        try {
            const result = await this.makeApiCall<GitHubRateLimit>(
                'rate_limit',
                'getRateLimit'
            );
            return result.resources.core;
        } catch (error) {
            logger.error({ error }, 'Failed to get rate limit');
            return {
                limit: 5000,
                remaining: 0,
                reset: Math.floor(Date.now() / 1000) + 3600,
                used: 5000
            };
        }
    }

    private async fetchRepoContent(owner: string, repo: string, path: string): Promise<GitHubContent> {
        const sanitizedInput = sanitizeRequest({ owner, repo, path });
        return this.fetchFromApi<GitHubContent>(
            `repos/${sanitizedInput.owner}/${sanitizedInput.repo}/contents/${sanitizedInput.path}`,
            'fetchRepoContent',
            sanitizedInput as Record<string, string>
        );
    }

    private async fetchFromApi<T extends GitHubCacheData>(
        path: string, 
        method: string, 
        params?: Record<string, string>
    ): Promise<T> {
        const result = await this.makeApiCall<T>(path, method, params);
        return (result as T);
    }

    private async makeApiCall<T>(
        path: string,
        method: string,
        params?: Record<string, string>
    ): Promise<GitHubApiResponse<T>> {
        this.updateMetricCounters(true);
        const cacheKey = this.buildCacheKey(path, params);
        const cached = this.getFromCache<GitHubApiResponse<T>>(cacheKey);
        
        if (cached) {
            this.cacheHits++;
            this.metrics.requests.inc({ method, status: 'cache_hit' });
            return cached;
        }

        this.cacheMisses++;
        const timer = this.metrics.duration.startTimer();
        
        try {
            const result = await this.circuitBreaker.execute(() => 
                this.client.get<GitHubApiResponse<T>>(path)
            );
            
            this.metrics.requests.inc({ method, status: 'success' });
            this.updateRateLimitMetrics(result.headers);
            this.updateLatencyMetrics();
            
            this.setCache(cacheKey, result.data as GitHubCacheData);
            return result.data;
        } catch (error) {
            this.updateMetricCounters(false);
            this.handleApiError(error as AxiosError, method);
            throw error;
        } finally {
            timer();
        }
    }

    private initializeClient(config: GitHubConfig): void {
        this.client = axios.create({
            baseURL: config.baseUrl,
            headers: {
                Authorization: `Bearer ${config.token}`,
                Accept: 'application/vnd.github.v3+json'
            },
            timeout: config.timeout || 10000
        });
    }

    private initializeCircuitBreaker(config: GitHubConfig): void {
        this.circuitBreaker = new CircuitBreaker('github-api', {
            failureThreshold: config.retry?.attempts || 3,
            resetTimeout: config.retry?.backoff ? 60000 : 30000
        });
    }

    private initializeCache(): void {
        this.cache = new LRUCache({
            max: 500,
            ttl: 1000 * 60 * 5,
            updateAgeOnGet: true,
            updateAgeOnHas: true
        });
    }

    private initializeCacheMonitoring(): void {
        this.cacheMonitorInterval = setInterval(() => {
            const size = this.calculateCacheSize();
            this.metrics.cacheSize.set(size);
        }, 60000) as NodeJS.Timeout;
    }

    private buildCacheKey(path: string, params?: Record<string, string>): string {
        return params ? `${path}:${JSON.stringify(params)}` : path;
    }

    private getFromCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (entry) {
            this.cacheHits++;
            return entry.data as T;
        }
        this.cacheMisses++;
        return null;
    }

    private setCache<T extends GitHubCacheData>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    private handleApiError(error: AxiosError, method: string): void {
        const errorType = this.determineErrorType(error);
        
        this.metrics.errors.inc({ type: errorType });
        
        logger.error({
            error,
            method,
            type: errorType,
            status: error.response?.status,
            path: error.config?.url
        }, `GitHub API Error: ${errorType}`);
        if (errorType === GitHubErrorType.RATE_LIMIT) {
            const headers = error.response?.headers as AxiosResponseHeaders;
            this.handleRateLimit(headers);
        }
    }

    private determineErrorType(error: AxiosError): GitHubErrorType {
        switch (error.response?.status) {
            case 429:
                return GitHubErrorType.RATE_LIMIT;
            case 404:
                return GitHubErrorType.NOT_FOUND;
            case 401:
                return GitHubErrorType.UNAUTHORIZED;
            default:
                return GitHubErrorType.UNKNOWN;
        }
    }

    private handleRateLimit(headers?: AxiosResponseHeaders): void {
        if (!headers) {
            logger.warn('No headers provided for rate limit handling');
            return;
        }

        const resetTime = parseInt(headers['x-ratelimit-reset'] || '0', 10);
        if (resetTime) {
            const now = Date.now() / 1000;
            const timeToReset = Math.max(0, resetTime - now);
            
            logger.warn({
                resetTime: new Date(resetTime * 1000),
                timeToReset,
                remaining: parseInt(headers['x-ratelimit-remaining'] || '0', 10)
            }, 'GitHub API rate limit exceeded');
        }
    }

    private validateConfig(config: GitHubConfig): void {
        logger.debug('Validating GitHub configuration');
        if (!config.token) {
            logger.error('GitHub token is missing');
            throw new Error('GitHub token is required');
        }
        if (!config.baseUrl) {
            logger.error('GitHub base URL is missing');
            throw new Error('GitHub base URL is required');
        }
    }
}