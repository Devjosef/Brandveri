// Types for software copyright detection and verification

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
        jurisdiction: string;  // Usually 'Worldwide' due to Berne's Convention
        explanation: string;
    };
    metadata: {
        confidence: number;
        matchSource: 'GITHUB';
        lastChecked: Date;
    };
}

export interface SoftwareSearchParams {
    query: string;
    page?: number;
    limit?: number;
    type?: 'PROPRIETARY' | 'OPEN_SOURCE' | 'ALL';
    license?: string[];  // SPDX identifiers
    minStars?: number;
    minConfidence?: number;
}

export interface SoftwareSearchResult {
    matches: SoftwareCopyright[];
    metadata: {
        totalCount: number;
        searchScore: number;
        query: string;
        filters: Partial<SoftwareSearchParams>;
        disclaimer: string;
        timestamp: Date;
    };
}

export interface ApiError {
    code: CopyrightErrorCode;
    message: string;
    details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    metadata?: {
        timestamp: string;
        requestId: string;
        rateLimit?: {
            remaining: number;
            reset: Date;
        };
        disclaimer?: string;
        totalCount?: number;
        searchScore?: number;
        lastUpdated?: string;
    };
}

export enum CopyrightErrorCode {
    SEARCH_ERROR = 'SEARCH_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    GITHUB_API_ERROR = 'GITHUB_API_ERROR',
    CACHE_ERROR = 'CACHE_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

// Configuration types
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

export interface CopyrightService {
    searchCopyright(query: string): Promise<ApiResponse<SoftwareSearchResult[]>>;
    getRepositoryDetails(owner: string, repo: string): Promise<ApiResponse<SoftwareCopyright>>;
}
