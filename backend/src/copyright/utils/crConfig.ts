import { z } from 'zod';


/** Github Configuration Schema
 * Primary source for software copyright verification.
 * Reasoning: Software is copyrighted upon creation by default.
 */
const githubConfigSchema = z.object({
    TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
    RATE_LIMIT: z.coerce.number().default(5000),
    TIMEOUT: z.coerce.number().default(5000),
    MAX_ITEMS_PER_SEARCH: z.coerce.number().default(100),
    RETRY_ATTEMPTS: z.coerce.number().default(3),
    RETRY_DELAY: z.coerce.number().default(1000) // ms
});

/** Cache Configuration Schema
 *  Performance and rate limit optimization specifically for github.
 */
const cacheConfigSchema = z.object({
    TTL: z.coerce.number().default(3600), // 1 hour
    MAX_SIZE: z.coerce.number().default(1000), // entries
    STALE_TTL: z.coerce.number().default(7200) // 2 hours
});

/** Search Configuration Schema
 *  Control search and behavior and limits.
 */
const searchConfigSchema = z.object({
    MIN_CONFIDENCE_SCORE: z.coerce.number().min(0).max(1).default(0.6),
    MAX_CONCURRENT_SEARCHES: z.coerce.number().default(5),
    TIMEOUT: z.coerce.number().default(10000), // ms
    MIN_QUERY_LENGTH: z.coerce.number().default(3)
});

/**
 * Complete Copyright Service Configuration.
 */
const crConfigSchema = z.object({
    GITHUB: githubConfigSchema,
    CACHE: cacheConfigSchema,
    SEARCH: searchConfigSchema,
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info')
});

/**
 * Environment variable mapping
 * Reasoning: Consistent naming and organization.
 */
const envVars = {
    GITHUB: {
        TOKEN: process.env.GITHUB_TOKEN,
        RATE_LIMIT: process.env.GITHUB_RATE_LIMIT,
        TIMEOUT: process.env.GITHUB_TIMEOUT,
        MAX_ITEMS_PER_SEARCH: process.env.GITHUB_MAX_ITEMS_PER_SEARCH,
        RETRY_ATTEMPTS: process.env.GITHUB_RETRY_ATTEMPTS,
        RETRY_DELAY: process.env.GITHUB_RETRY_DELAY
    },
    CACHE: {
        TTL: process.env.CR_CACHE_TTL,
        MAX_SIZE: process.env.CR_CACHE_MAX_SIZE,
        STALE_TTL: process.env.CR_CACHE_STALE_TTL
    },
    SEARCH: {
        MIN_CONFIDENCE_SCORE: process.env.CR_MIN_CONFIDENCE_SCORE,
        MAX_CONCURRENT_SEARCHES: process.env.CR_MAX_CONCURRENT_SEARCHES,
        TIMEOUT: process.env.CR_SEARCH_TIMEOUT,
        MIN_QUERY_LENGTH: process.env.CR_MIN_QUERY_LENGTH
    },
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL
};

/** Validated Configuration
 * Reasoning: Type-safe and validated configuration object.
 */
export const crConfig = crConfigSchema.parse(envVars);

/**
 * Type exports for TypeScript support.
 */
export type CRConfig = z.infer<typeof crConfigSchema>;

/**
 * Configuration validation helper
 * Reasoning: Easy validation in different contexts.
 */
export function validateConfig(config: unknown): CRConfig {
    return crConfigSchema.parse(config);
}