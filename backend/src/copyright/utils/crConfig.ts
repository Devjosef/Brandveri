import { z } from 'zod';
import { serviceConfig } from '../../utils/env';

/** Github Configuration Schema */
const githubConfigSchema = z.object({
    TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
    RATE_LIMIT: z.coerce.number().default(serviceConfig.copyright.github.rateLimit),
    TIMEOUT: z.coerce.number().default(serviceConfig.copyright.github.timeout),
    MAX_ITEMS_PER_SEARCH: z.coerce.number().default(serviceConfig.copyright.github.maxItems),
    RETRY_ATTEMPTS: z.coerce.number().default(serviceConfig.copyright.github.retryAttempts),
    RETRY_DELAY: z.coerce.number().default(serviceConfig.copyright.github.retryDelay)
});

/** Cache Configuration Schema */
const cacheConfigSchema = z.object({
    TTL: z.coerce.number().default(serviceConfig.copyright.cache.ttl),
    MAX_SIZE: z.coerce.number().default(serviceConfig.copyright.cache.maxSize),
    STALE_TTL: z.coerce.number().default(serviceConfig.copyright.cache.ttl * 2)
});

/** Search Configuration Schema */
const searchConfigSchema = z.object({
    MIN_CONFIDENCE_SCORE: z.coerce.number().min(0).max(1).default(0.6),
    MAX_CONCURRENT_SEARCHES: z.coerce.number().default(5),
    TIMEOUT: z.coerce.number().default(serviceConfig.copyright.api.timeout),
    MIN_QUERY_LENGTH: z.coerce.number().default(3)
});

/** Validation Configuration Schema */
const validationConfigSchema = z.object({
    MAX_QUERY_SIZE: z.coerce.number().default(serviceConfig.copyright.validation.maxQuerySize),
    MAX_PATH_SIZE: z.coerce.number().default(serviceConfig.copyright.validation.maxPathSize)
});

/**
 * Complete Copyright Service Configuration
 */
const crConfigSchema = z.object({
    GITHUB: githubConfigSchema,
    CACHE: cacheConfigSchema,
    SEARCH: searchConfigSchema,
    VALIDATION: validationConfigSchema,
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info')
});

/**
 * Environment variable mapping
 */
const envVars = {
    GITHUB: {
        TOKEN: serviceConfig.copyright.github.token,
        RATE_LIMIT: serviceConfig.copyright.github.rateLimit,
        TIMEOUT: serviceConfig.copyright.github.timeout,
        MAX_ITEMS_PER_SEARCH: serviceConfig.copyright.github.maxItems,
        RETRY_ATTEMPTS: serviceConfig.copyright.github.retryAttempts,
        RETRY_DELAY: serviceConfig.copyright.github.retryDelay
    },
    CACHE: {
        TTL: serviceConfig.copyright.cache.ttl,
        MAX_SIZE: serviceConfig.copyright.cache.maxSize,
        STALE_TTL: serviceConfig.copyright.cache.ttl * 2
    },
    SEARCH: {
        MIN_CONFIDENCE_SCORE: 0.6,  
        MAX_CONCURRENT_SEARCHES: 5,  
        TIMEOUT: serviceConfig.copyright.api.timeout,
        MIN_QUERY_LENGTH: 3         
    },
    VALIDATION: {
        MAX_QUERY_SIZE: serviceConfig.copyright.validation.maxQuerySize,
        MAX_PATH_SIZE: serviceConfig.copyright.validation.maxPathSize
    },
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL
};

/** Validated Configuration */
export const crConfig = crConfigSchema.parse(envVars);

/** Type exports */
export type CRConfig = z.infer<typeof crConfigSchema>;

/** Configuration validation helper */
export function validateConfig(config: unknown): CRConfig {
    return crConfigSchema.parse(config);
}