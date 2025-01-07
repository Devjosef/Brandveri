import { 
    GitHubRepository, 
    GitHubServiceHealth, 
    GitHubMetrics,
    GitHubLicense
} from './github';

/**
 * License Types
 */
export interface License {
    readonly type: string;  // SPDX identifier from GitHubLicense
    readonly url?: string;
    readonly permissions?: ReadonlyArray<string>;
    readonly limitations?: ReadonlyArray<string>;
}

/**
 * Core Copyright Types
 */
export interface SoftwareCopyright {
    readonly id: string;
    readonly name: string;
    readonly type: 'PROPRIETARY' | 'OPEN_SOURCE' | 'UNKNOWN';
    readonly repository: {
        readonly url: string;
        readonly owner: string;
        readonly name: string;
        readonly stars: number;
        readonly createdAt: Date;
        readonly lastUpdated: Date;
    };
    readonly license: License | null; // Now using the License interface
    readonly copyrightStatus: {
        readonly isProtected: boolean;
        readonly creationDate: Date;
        readonly jurisdiction: string;
        readonly explanation: string;
    };
    readonly validationStatus: {
        readonly isValid: boolean;
        readonly errors?: ReadonlyArray<string>;
        readonly lastValidated: Date;
    };
}

/**
 * API Types
 */
export interface ApiResponse<T> {
    readonly success: boolean;
    readonly data: T;
    readonly metadata: ResponseMetadata;
}

export interface ResponseMetadata {
    readonly timestamp: string;
    readonly requestId: string;
    readonly source: 'CACHE' | 'GITHUB' | 'FALLBACK';
    readonly disclaimer?: string;
    readonly performance?: {
        readonly duration: number;
        readonly cacheHit: boolean;
        readonly rateLimitRemaining: number;
    };
}

/**
 * Service Health & Monitoring
 */
export interface ServiceHealth {
    readonly status: 'healthy' | 'degraded' | 'unhealthy';
    readonly timestamp: string;
    readonly components: {
        readonly github: GitHubServiceHealth;
        readonly cache: CacheHealth;
        readonly circuitBreaker: CircuitBreakerHealth;
        readonly rateLimiter: RateLimiterHealth;
    };
    readonly metrics: CopyrightMetrics;
}

export interface CacheHealth {
    readonly status: string;
    readonly details?: string;
}

export interface CircuitBreakerHealth {
    readonly status: 'open' | 'closed';
    readonly failures: number;
}

export interface RateLimiterHealth {
    readonly status: string;
    readonly currentLoad: number;
}

export interface CopyrightMetrics {
    readonly requests: {
        readonly total: number;
        readonly errors: number;
        readonly concurrent: number;
    };
    readonly performance: {
        readonly averageResponseTime: number;
        readonly p95ResponseTime: number;
        readonly p99ResponseTime: number;
    };
    readonly cache: {
        readonly hitRate: number;
        readonly size: number;
        readonly capacity: number;
    };
    readonly github: GitHubMetrics;
}

/**
 * Error Handling
 */
export enum CopyrightErrorCode {
    SEARCH_ERROR = 'SEARCH_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    GITHUB_API_ERROR = 'GITHUB_API_ERROR',
    CACHE_ERROR = 'CACHE_ERROR',
    CIRCUIT_BREAKER_ERROR = 'CIRCUIT_BREAKER_ERROR',
    INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
    SHUTDOWN_ERROR = 'SHUTDOWN_ERROR',
    OPERATION_ERROR = 'OPERATION_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Service Interface
 */
export interface ICopyrightService {
    searchCopyright(
        query: string,
        params?: Partial<SoftwareSearchParams>
    ): Promise<ApiResponse<SoftwareSearchResult>>;

    getRepositoryDetails(
        owner: string,
        repo: string
    ): Promise<ApiResponse<SoftwareSearchResult>>;

    getServiceHealth(): Promise<ServiceHealth>;
    getMetrics(): CopyrightMetrics;
    dispose(): Promise<void>;
}

export { GitHubRepository };

/**
 * Search Parameters
 */
export interface SoftwareSearchParams {
    readonly query: string;
    readonly type?: 'PROPRIETARY' | 'OPEN_SOURCE' | 'ALL';
    readonly license?: ReadonlyArray<string>;
    readonly minStars?: number;
    readonly minConfidence?: number;
    readonly page: number;
    readonly limit: number;
}

