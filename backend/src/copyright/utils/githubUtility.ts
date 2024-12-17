import axios, { AxiosInstance, AxiosError, RawAxiosResponseHeaders, AxiosResponseHeaders } from "axios";
import { CircuitBreaker } from '../../utils/circuitBreaker';
import { Counter, Histogram, Gauge } from 'prom-client';
import { LRUCache } from 'lru-cache';
import { loggers } from '../../../observability/contextLoggers';
import { 
    GitHubConfig,
} from '../../../types/github';

const logger = loggers.copyright;

export class GitHubUtility {
    private readonly client: AxiosInstance;
    private readonly circuitBreaker: CircuitBreaker;
    private readonly cache: LRUCache<string, any>;
    private readonly metrics = {
        requests: new Counter({
            name: 'github_requests_total',
            help: 'Total GitHub API requests',
            labelNames: ['method']
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
        })
    };

    constructor(config: GitHubConfig) {
        this.validateConfig(config);
        
        this.client = axios.create({
            baseURL: config.baseUrl,
            headers: {
                Authorization: `Bearer ${config.token}`,
                Accept: 'application/vnd.github.v3+json'
            },
            timeout: 10000 // 10 seconds
        });
        
        this.circuitBreaker = new CircuitBreaker('github-api', {
            failureThreshold: config.retry?.attempts || 3,
            resetTimeout: config.retry?.backoff ? 60000 : 30000
        });
        this.cache = new LRUCache({
            max: 500,
            ttl: 1000 * 60 * 5
        });
    }

    private validateConfig(config: GitHubConfig): void {
        if (!config.token) {
            throw new Error('GitHub token is required');
        }
        if (!config.baseUrl) {
            throw new Error('GitHub base URL is required');
        }
    }

    private updateRateLimitMetrics(headers: RawAxiosResponseHeaders | AxiosResponseHeaders): void {
        const remaining = parseInt(String(headers['x-ratelimit-remaining'] || '0'), 10);
        this.metrics.rateLimit.set(remaining);

        const resetTime = parseInt(String(headers['x-ratelimit-reset'] || '0'), 10);
        if (resetTime) {
            const now = Date.now() / 1000;
            const timeToReset = Math.max(0, resetTime - now);
            logger.debug({ 
                remaining, 
                resetTime: new Date(resetTime * 1000), 
                timeToReset 
            }, 'GitHub rate limit update');
        }
    }

    private handleRateLimit(headers: RawAxiosResponseHeaders | AxiosResponseHeaders | undefined): void {
        if (!headers) return;

        const resetTime = parseInt(String(headers['x-ratelimit-reset'] || '0'), 10);
        if (resetTime) {
            const now = Date.now() / 1000;
            const timeToReset = Math.max(0, resetTime - now);
            
            logger.warn({
                resetTime: new Date(resetTime * 1000),
                timeToReset,
                remaining: parseInt(String(headers['x-ratelimit-remaining'] || '0'), 10)
            }, 'GitHub API rate limit exceeded');

            if (timeToReset > 0) {
                this.metrics.errors.inc({ type: 'RATE_LIMIT' });
                throw new Error(`Rate limit exceeded. Resets in ${Math.ceil(timeToReset)} seconds`);
            }
        }
    }

    async fetchRepoContent(owner: string, repo: string, path: string): Promise<any> {
        const cacheKey = `${owner}/${repo}/${path}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        const timer = this.metrics.duration.startTimer();
        
        try {
            const result = await this.circuitBreaker.execute(() => 
                this.client.get(`/repos/${owner}/${repo}/contents/${path}`)
            );
            
            this.metrics.requests.inc({ method: 'fetchRepoContent' });
            this.updateRateLimitMetrics(result.headers);
            
            this.cache.set(cacheKey, result.data);
            return result.data;
        } catch (error) {
            this.handleApiError(error as AxiosError, 'fetchRepoContent');
            throw error;
        } finally {
            timer();
        }
    }

    async getRepository(owner: string, repo: string): Promise<any> {
        const cacheKey = `${owner}/${repo}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        const timer = this.metrics.duration.startTimer();
        
        try {
            const result = await this.circuitBreaker.execute(() => 
                this.client.get(`/repos/${owner}/${repo}`)
            );
            
            this.metrics.requests.inc({ method: 'getRepository' });
            this.updateRateLimitMetrics(result.headers);
            
            this.cache.set(cacheKey, result.data);
            return result.data;
        } catch (error) {
            this.handleApiError(error as AxiosError, 'getRepository');
            throw error;
        } finally {
            timer();
        }
    }

    private handleApiError(error: AxiosError, context: string): void {
        const errorType = this.classifyError(error);
        this.metrics.errors.inc({ type: errorType });
        
        logger.error({
            error,
            context,
            type: errorType,
            status: error.response?.status,
            data: error.response?.data
        }, 'GitHub API Error');

        if (errorType === 'RATE_LIMIT') {
            this.handleRateLimit(error.response?.headers);
        }
    }

    private classifyError(error: AxiosError): string {
        if (error.response?.status === 429) return 'RATE_LIMIT';
        if (error.response?.status === 404) return 'NOT_FOUND';
        if (error.response?.status === 401) return 'UNAUTHORIZED';
        return 'UNKNOWN';
    }

    async getHealth(): Promise<any> {
        try {
            const rateLimit = await this.client.get('/rate_limit');
            return {
                isHealthy: true,
                lastCheck: new Date(),
                rateLimitInfo: rateLimit.data.resources.core
            };
        } catch (error) {
            return {
                isHealthy: false,
                lastCheck: new Date(),
                error: (error as Error).message
            };
        }
    }

    getMetrics(): any {
        return {
            requests: this.metrics.requests.get(),
            errors: this.metrics.errors.get(),
            rateLimit: this.metrics.rateLimit.get(),
            duration: this.metrics.duration.get()
        };
    }
}


