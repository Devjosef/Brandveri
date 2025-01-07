import { 
    GitHubRepository, 
    GitHubServiceHealth, 
    GitHubMetrics
} from './github';

/**
 * Core Copyright Types
 */
export interface SoftwareCopyright {
    id: string;
    name: string;
    type: 'PROPRIETARY' | 'OPEN_SOURCE' | 'UNKNOWN';
    repository: {
        url: string;
        owner: string;
        name: string;
        stars: number;
        createdAt: Date;
        lastUpdated: Date;
    };
    license: {
        type: string;  // SPDX identifier
        url?: string;
        permissions?: string[];
        limitations?: string[];
    };
    copyrightStatus: {
        isProtected: boolean;
        creationDate: Date;
        jurisdiction: string;
        explanation: string;
    };
    validationStatus: {
        isValid: boolean;
        errors?: string[];
        lastValidated: Date;
    };
}

/**
 * Service Health & Monitoring
 */
export interface ServiceHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    components: {
        github: GitHubServiceHealth;
        cache: CacheHealth;
        circuitBreaker: CircuitBreakerHealth;
        rateLimiter: RateLimiterHealth;
    };
    metrics: CopyrightMetrics;
}

export interface CacheHealth {
    status: string;
    details?: string;
}

export interface CircuitBreakerHealth {
    status: 'open' | 'closed';
    failures: number;
}

export interface RateLimiterHealth {
    status: string;
    currentLoad: number;
}

export interface CopyrightMetrics {
    requests: {
        total: number;
        errors: number;
        concurrent: number;
    };
    performance: {
        averageResponseTime: number;
        p95ResponseTime: number;
        p99ResponseTime: number;
    };
    cache: {
        hitRate: number;
        size: number;
        capacity: number;
    };
    github: GitHubMetrics;
}

/**
 * API Types
 */
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    metadata: ResponseMetadata;
}

export interface ResponseMetadata {
    timestamp: string;
    requestId: string;
    source: 'CACHE' | 'GITHUB' | 'FALLBACK';
    disclaimer?: string;
    performance?: {
        duration: number;
        cacheHit: boolean;
        rateLimitRemaining: number;
    };
}

/**
 * Search Types
 */
export interface SoftwareSearchParams {
    query: string;
    page?: number;
    limit?: number;
    type?: 'PROPRIETARY' | 'OPEN_SOURCE' | 'ALL';
    license?: string[];
    minStars?: number;
    minConfidence?: number;
    validateLicenses?: boolean;
}

export interface SoftwareSearchResult {
    matches: Array<SoftwareCopyright & {
        confidence: number;
        source: 'GITHUB';
        details: string;
        lastChecked: Date;
    }>;
    metadata: SearchResultMetadata;
    stats?: CopyrightMetrics;
}

export interface SearchResultMetadata extends ResponseMetadata {
    totalCount: number;
    searchScore: number;
    query: string;
    filters: Partial<SoftwareSearchParams>;
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
