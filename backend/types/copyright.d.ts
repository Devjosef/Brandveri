// Types for software copyright detection and verification

// Base metadata type for consistency
export interface BaseMetadata {
    timestamp: string;
    requestId: string;
    disclaimer?: string;
    lastUpdated?: string;
    totalCount?: number;
    searchScore?: number;
    rateLimit?: {
        remaining: number;
        reset: Date;
    };
}

// Software copyright core type
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
}

// Search parameters
export interface SoftwareSearchParams {
    query: string;
    page?: number;
    limit?: number;
    type?: 'PROPRIETARY' | 'OPEN_SOURCE' | 'ALL';
    license?: string[];  // SPDX identifiers
    minStars?: number;
    minConfidence?: number;
}

// Search result metadata extends base metadata
export interface SearchResultMetadata extends BaseMetadata {
    totalCount: number;
    searchScore: number;
    query: string;
    filters: Partial<SoftwareSearchParams>;
    lastUpdated?: string;
}

// Search result type
export interface SoftwareSearchResult {
    matches: Array<SoftwareCopyright & {
        confidence: number;
        source: 'GITHUB';
        details: string;
        lastChecked: Date;
    }>;
    metadata: SearchResultMetadata;
}

// API response wrapper
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: CopyrightErrorCode;
        message: string;
        details?: Record<string, unknown>;
    };
    metadata: BaseMetadata;
}

// Service interface aligned with implementation
export interface CopyrightService {
    searchCopyright(query: string): Promise<ApiResponse<SoftwareSearchResult>>;
    getRepositoryDetails(owner: string, repo: string): Promise<ApiResponse<SoftwareSearchResult>>;
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

// GitHub API specific types
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
}

// Transform function type
export type TransformGitHubData = (repo: GitHubRepository) => SoftwareCopyright;
