import { AxiosResponse } from 'axios';

/**
 * Core GitHub types with better type safety
 */
export interface GitHubRepository {
    readonly id: number;
    readonly node_id: string;
    readonly name: string;
    readonly full_name: string;
    readonly private: boolean;
    readonly owner: GitHubOwner;
    readonly html_url: string;
    readonly description: string | null;
    readonly fork: boolean;
    readonly url: string;
    readonly created_at: string;
    readonly updated_at: string;
    readonly pushed_at: string;
    readonly git_url: string;
    readonly ssh_url: string;
    readonly clone_url: string;
    readonly homepage: string | null;
    readonly size: number;
    readonly stargazers_count: number;
    readonly watchers_count: number;
    readonly language: string | null;
    readonly forks_count: number;
    readonly archived: boolean;
    readonly disabled: boolean;
    readonly open_issues_count: number;
    readonly license: GitHubLicense | null;
    readonly topics: ReadonlyArray<string>;
    readonly visibility: GitHubVisibility;
    readonly default_branch: string;
    readonly permissions?: GitHubPermissions;
}

export interface GitHubOwner {
    readonly login: string;
    readonly id: number;
    readonly type: string;
    readonly site_admin: boolean;
}

export type GitHubVisibility = 'public' | 'private';

export interface GitHubLicense {
    readonly key: string;
    readonly name: string;
    readonly spdx_id: string;
    readonly url: string;
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
    reset: string;
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

/**
 * GitHub Service Health Types
 */
export interface GitHubServiceHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
    timestamp: string;
    rateLimit?: {
        remaining: number;
        reset: string;
    };
    latency?: number;
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
