// Types for software copyright detection and verification

// Core metadata types for monitoring and tracking
export interface RateLimitInfo {
    remaining: number;
    reset: Date;
    limit: number;
}

export interface ServiceHealth {
    isHealthy: boolean;
    lastCheck: Date;
    failureCount: number;
    rateLimitInfo: RateLimitInfo;
}

export interface CopyrightMetrics {
    searchLatency: number;
    cacheHitRate: number;
    errorRate: number;
    rateLimitRemaining: number;
    totalRequests: number;
    activeRequests: number;
}

// Cache management
export interface CacheEntry<T> {
    data: T;
    timestamp: Date;
    expiresAt: Date;
    isStale: boolean;
}

// Base metadata for all responses
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

// Core software copyright type
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
        isProtected: boolean;  // Always true for software
        creationDate: Date;
        jurisdiction: string;  // Usually 'Worldwide' due to Berne's Convention.
        explanation: string;
    };
    validationStatus: {
        isValid: boolean;
        errors?: string[];
        lastValidated: Date;
    };
}

// Search parameters with validation
export interface SoftwareSearchParams {
    query: string;
    page?: number;
    limit?: number;
    type?: 'PROPRIETARY' | 'OPEN_SOURCE' | 'ALL';
    license?: string[];  // SPDX identifiers
    minStars?: number;
    minConfidence?: number;
    validateLicenses?: boolean;
}

// API Response metadata
export interface ApiResponseMetadata extends BaseMetadata {
    serviceHealth?: ServiceHealth;
    metrics?: Partial<CopyrightMetrics>;
}

// Search result metadata
export interface SearchResultMetadata extends BaseMetadata {
    totalCount: number;
    searchScore: number;
    query: string;
    filters: Partial<SoftwareSearchParams>;
}

// Software search result with enhanced tracking
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

// API response wrapper with enhanced error handling
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

// Enhanced service interface
export interface CopyrightService {
    // Core operations
    searchCopyright(query: string, params?: Partial<SoftwareSearchParams>): Promise<ApiResponse<SoftwareSearchResult>>;
    getRepositoryDetails(owner: string, repo: string): Promise<ApiResponse<SoftwareSearchResult>>;
    
    // Health and monitoring
    getServiceHealth(): Promise<ServiceHealth>;
    getMetrics(): CopyrightMetrics;
    
    // Cache operations
    clearCache(): Promise<void>;
    refreshCache(query: string): Promise<void>;
}

// Error handling
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

// Configuration types
export interface ValidationConfig {
    maxQuerySize: number;
    maxPathSize: number;
    allowedLicenses: string[];  // SPDX identifiers.
}

export interface GithubConfig {
    TOKEN: string;
    RATE_LIMIT: number;
    TIMEOUT: number;
    MAX_ITEMS_PER_SEARCH: number;
    RETRY_ATTEMPTS: number;
    RETRY_DELAY: number;
}

export interface CacheConfig {
    TTL: number;
    MAX_SIZE: number;
    STALE_TTL: number;
}

export interface SearchConfig {
    MIN_CONFIDENCE_SCORE: number;
    MAX_CONCURRENT_SEARCHES: number;
    TIMEOUT: number;
    MIN_QUERY_LENGTH: number;
}

// GitHub API interface with repository pattern.
export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    description: string | null;
    owner: {
        login: string;
        id: number;
        html_url: string;
    };
    created_at: string;
    updated_at: string;
    stargazers_count: number;
    license: {
        key: string;
        name: string;
        spdx_id: string;
        url: string;
    } | null;
    
    // Repository pattern methods.
    getDetails(owner: string, repo: string): Promise<SoftwareCopyright>;
    searchRepositories(query: string): Promise<SoftwareSearchResult>;
    getRateLimit(): Promise<RateLimitInfo>;
}

// Transform function type
export type TransformGitHubData = (repo: GitHubRepository) => SoftwareCopyright;
