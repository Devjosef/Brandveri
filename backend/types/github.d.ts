import { AxiosResponse } from 'axios';

export interface GitHubConfig {
    baseUrl: string;
    token: string;
    rateLimit: {
        maxRequests: number;
        perMilliseconds: number;
    };
    retry: {
        attempts: number;
        backoff: boolean;
    };
}

export interface GitHubRateLimit {
    limit: number;
    remaining: number;
    reset: number;
    used: number;
}

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
}

export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
        login: string;
        id: number;
        type: string;
    };
    description: string | null;
    fork: boolean;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string | null;
    license: {
        key: string;
        name: string;
        spdx_id: string;
        url: string;
    } | null;
}

export interface GitHubContent {
    type: 'file' | 'dir' | 'symlink' | 'submodule';
    encoding: string;
    size: number;
    name: string;
    path: string;
    content?: string;
    sha: string;
    url: string;
    git_url: string | null;
    html_url: string | null;
    download_url: string | null;
}

export interface GitHubApiResponse<T> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

export interface GitHubUtilityInterface {
    fetchRepoContent(owner: string, repo: string, path: string): Promise<GitHubContent>;
    getRepository(owner: string, repo: string): Promise<GitHubRepository>;
    getMetrics(): GitHubMetrics;
    getRateLimit(): Promise<GitHubRateLimit>;
    isHealthy(): Promise<boolean>;
}

// Cache types
export interface CacheConfig {
    max: number;
    ttl: number;
}

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expires: number;
}

// Circuit Breaker types
export interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
    monitorInterval?: number;
}

export interface CircuitBreakerState {
    failures: number;
    lastFailure: number | null;
    isOpen: boolean;
}

// Metric types
export interface MetricLabels {
    method: string;
    status?: string;
    error_type?: GitHubErrorType;
}

export interface RequestMetrics {
    duration: number;
    status: number;
    method: string;
    path: string;
    timestamp: number;
}
