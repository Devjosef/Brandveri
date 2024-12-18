import { 
    GitHubRepository, 
    GitHubServiceHealth, 
    GitHubMetrics,
    GitHubUtilityInterface
} from './github';

// Core metadata types for monitoring and tracking, related to copyrights.
export interface RateLimitInfo {
    remaining: number;
    reset: Date;
    limit: number;
}

export interface ServiceHealth extends GitHubServiceHealth {
    lastCheck: Date;
    failureCount: number;
    rateLimitInfo: RateLimitInfo;
}

export interface CopyrightMetrics extends GitHubMetrics {
    searchLatency: number;
    cacheHitRate: number;
    errorRate: number;
    rateLimitRemaining: number;
    totalRequests: number;
    activeRequests: number;
}

// Cache management.
export interface CacheEntry<T> {
    data: T;
    timestamp: Date;
    expiresAt: Date;
    isStale: boolean;
}

// Base metadata for all responses.
export interface BaseMetadata {
    timestamp: string;
    requestId: string;
    disclaimer?: string;
    lastUpdated?: string;
    performance?: {
        duration: number;
        cacheHit: boolean;
        rateLimitRemaining: number;
    };
    source: 'CACHE' | 'GITHUB' | 'FALLBACK';
}

// Core software copyright type.
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
        type: string;  // SPDX identifier (System Package Data Exchange)
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

// Search parameters.
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

// API Response metadata.
export interface ApiResponseMetadata extends BaseMetadata {
    serviceHealth?: ServiceHealth;
    metrics?: Partial<CopyrightMetrics>;
}

// Search result metadata.
export interface SearchResultMetadata extends BaseMetadata {
    totalCount: number;
    searchScore: number;
    query: string;
    filters: Partial<SoftwareSearchParams>;
}

// Software search result.
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

// API response wrapper.
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: {
        code: CopyrightErrorCode;
        message: string;
        details?: Record<string, unknown>;
        retryAfter?: number;
        suggestion?: string;
    };
    metadata: ApiResponseMetadata;
}

// Error handling.
export enum CopyrightErrorCode {
    SEARCH_ERROR = 'SEARCH_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    GITHUB_API_ERROR = 'GITHUB_API_ERROR',
    CACHE_ERROR = 'CACHE_ERROR',
    CIRCUIT_BREAKER_ERROR = 'CIRCUIT_BREAKER_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Service interfaces.
export interface CopyrightService {
    readonly github: GitHubUtilityInterface;
    readonly transformer: CopyrightTransformer;
    readonly validator: CopyrightValidator;

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
}

// Transformer interface
export interface CopyrightTransformer {
    transformGithubData(repo: GitHubRepository): SoftwareCopyright;
    createApiResponse<T>(data: T, requestId: string): ApiResponse<T>;
}

// Validator interface
export interface CopyrightValidator {
    validateSearchQuery(
        query: string, 
        params?: Partial<SoftwareSearchParams>
    ): { query: string; params: SoftwareSearchParams };
    
    validateRepoParams(
        owner: string, 
        repo: string
    ): { owner: string; repo: string };
}

// Configuration types
export interface ValidationConfig {
    maxQuerySize: number;
    maxPathSize: number;
    allowedLicenses: string[];  // SPDX identifiers (System Package Data Exchange).
}

export interface SearchConfig {
    MIN_CONFIDENCE_SCORE: number;
    MAX_CONCURRENT_SEARCHES: number;
    TIMEOUT: number;
    MIN_QUERY_LENGTH: number;
}
