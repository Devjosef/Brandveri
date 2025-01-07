import { AxiosResponse } from 'axios';

// Core GitHub types
export interface GitHubRepository {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
        login: string;
        id: number;
        type: string;
        site_admin: boolean;
    };
    html_url: string;
    description: string | null;
    fork: boolean;
    url: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    git_url: string;
    ssh_url: string;
    clone_url: string;
    homepage: string | null;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string | null;
    forks_count: number;
    archived: boolean;
    disabled: boolean;
    open_issues_count: number;
    license: GitHubLicense | null;
    topics: string[];
    visibility: 'public' | 'private';
    default_branch: string;
    permissions?: GitHubPermissions;
}

export interface GitHubLicense {
    key: string;
    name: string;
    spdx_id: string;
    url: string;
}

export interface GitHubPermissions {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
}

// GitHubContent interface
export interface GitHubContent {
    type: 'file' | 'dir' | 'symlink' | 'submodule';
    encoding?: 'base64' | string;
    size: number;
    name: string;
    path: string;
    content?: string;
    sha: string;
    url: string;
    git_url: string;
    html_url: string;
    download_url: string | null;
    _links: {
        self: string;
        git: string;
        html: string;
    };
}

// GitHubSearchOptions interface
export interface GitHubSearchOptions {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
    language?: string;
    topic?: string;
    license?: string;
    user?: string;
    org?: string;
    is?: Array<'public' | 'private' | 'fork' | 'archived'>;
    created?: string;
    pushed?: string;
    size?: string;
    stars?: string;
}

// Configuration and metrics
export interface GitHubConfig {
    cache: any;
    baseUrl: string;
    token: string;
    rateLimit: RateLimiterConfig;
    retry: {
        attempts: number;
        backoff: boolean;
    };
    timeout?: number;
    maxItemsPerSearch?: number;
}

export interface GitHubMetrics {
    requests: {
        total: number;
        successful: number;
        failed: number;
    };
    rateLimit: GitHubRateLimit;
    latency: {
        avg: number;
        p95: number;
        p99: number;
    };
    cache: {
        hits: number;
        misses: number;
        size: number;
    };
}

// Rate limiting
export interface GitHubRateLimit {
    limit: number;
    remaining: number;
    reset: number;
    used: number;
}

// Service interfaces
export interface GitHubUtilityInterface {
    search(query: string, options?: GitHubSearchOptions): Promise<GitHubRepository[]>;
    getRepository(owner: string, repo: string): Promise<GitHubRepository>;
    getContent(owner: string, repo: string, path: string): Promise<GitHubContent>;
    getHealth(): Promise<GitHubServiceHealth>;
    getMetrics(): GitHubMetrics;
    getRateLimit(): Promise<GitHubRateLimit>;
}

// Health and monitoring
export interface GitHubServiceHealth {
    isHealthy: boolean;
    lastCheck: Date;
    failureCount: number;
    rateLimitInfo: GitHubRateLimit;
}

// Shared configuration types
export interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
    monitorInterval?: number;
}

export interface RateLimiterConfig {
    maxRequests: number;
    perMilliseconds: number;
}

export interface CacheConfig {
    max: number;
    ttl: number;
}

// Error handling
export interface GitHubError {
    type: GitHubErrorType;
    status?: number;
    message: string;
    context: string;
    data?: unknown;
}

export enum GitHubErrorType {
    RATE_LIMIT = 'RATE_LIMIT',
    NOT_FOUND = 'NOT_FOUND',
    UNAUTHORIZED = 'UNAUTHORIZED',
    VALIDATION = 'VALIDATION',
    NETWORK = 'NETWORK',
    UNKNOWN = 'UNKNOWN'
}
