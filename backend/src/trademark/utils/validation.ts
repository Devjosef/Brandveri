import { z } from 'zod';
import { NiceClassification } from '../../../types/trademark';
import { createValidator } from '../../../middleware/validator';
import { Response, NextFunction } from 'express';
import { TrademarkSearchParams } from '../../../types/trademark';
import { TrademarkStatus } from '../../../types/trademark';

// Feature Flags Schema
export const FeatureFlagSchema = z.object({
    TRADEMARK: z.object({
        ENABLE_CACHE: z.boolean().default(true),
        ENABLE_CONCURRENT_SEARCH: z.boolean().default(true),
        ENABLE_SIMILARITY_CHECK: z.boolean().default(false),
        ENABLE_RATE_LIMITING: z.boolean().default(true),
        ENABLE_FUZZY_SEARCH: z.boolean().default(false),
        MAX_CONCURRENT_REQUESTS: z.number().default(5),
        EXPERIMENTAL: z.object({
            USE_NEW_SEARCH_ALGORITHM: z.boolean().default(false),
            ENABLE_MACHINE_LEARNING: z.boolean().default(false),
            ENABLE_BLOCKCHAIN_VERIFICATION: z.boolean().default(false)
        })
    })
});

// Load and validate feature flags
export const featureFlags = FeatureFlagSchema.parse({
    TRADEMARK: {
        ENABLE_CACHE: process.env.ENABLE_TRADEMARK_CACHE !== 'false',
        ENABLE_CONCURRENT_SEARCH: process.env.ENABLE_CONCURRENT_SEARCH !== 'false',
        ENABLE_SIMILARITY_CHECK: process.env.ENABLE_SIMILARITY_CHECK === 'true',
        ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
        ENABLE_FUZZY_SEARCH: process.env.ENABLE_FUZZY_SEARCH === 'true',
        MAX_CONCURRENT_REQUESTS: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5', 10),
        EXPERIMENTAL: {
            USE_NEW_SEARCH_ALGORITHM: process.env.USE_NEW_SEARCH_ALGORITHM === 'true',
            ENABLE_MACHINE_LEARNING: process.env.ENABLE_MACHINE_LEARNING === 'true',
            ENABLE_BLOCKCHAIN_VERIFICATION: process.env.ENABLE_BLOCKCHAIN_VERIFICATION === 'true'
        }
    }
});

// Config Schema
export const ConfigSchema = z.object({
    API_VERSION: z.string().default('1.0.0'),
    ENV: z.enum(['development', 'staging', 'production']).default('development'),
    TRADEMARK: z.object({
        VERSION: z.string(),
        CACHE_TTL: z.number(),
        NICE_CLASSES: z.object({
            MIN: z.number().default(1),
            MAX: z.number().default(45)
        }),
        SEARCH: z.object({
            MIN_QUERY_LENGTH: z.number().default(3),
            MAX_QUERY_LENGTH: z.number().default(255),
            DEFAULT_PAGE_SIZE: z.number().default(20),
            MAX_PAGE_SIZE: z.number().default(100)
        }),
        uspto: z.object({
            url: z.string(),
            key: z.string()
        }),
        euipo: z.object({
            url: z.string(),
            key: z.string()
        })
    })
});

// Load and validate config
export const config = ConfigSchema.parse({
    API_VERSION: process.env.API_VERSION || '1.0.0',
    ENV: process.env.NODE_ENV || 'development',
    TRADEMARK: {
        VERSION: process.env.TRADEMARK_VERSION || '1.0.0',
        CACHE_TTL: parseInt(process.env.TRADEMARK_CACHE_TTL || '3600', 10),
        NICE_CLASSES: {
            MIN: parseInt(process.env.TRADEMARK_NICE_CLASSES_MIN || '1', 10),
            MAX: parseInt(process.env.TRADEMARK_NICE_CLASSES_MAX || '45', 10)
        },
        SEARCH: {
            MIN_QUERY_LENGTH: parseInt(process.env.TRADEMARK_MIN_QUERY_LENGTH || '3', 10),
            MAX_QUERY_LENGTH: parseInt(process.env.TRADEMARK_MAX_QUERY_LENGTH || '255', 10),
            DEFAULT_PAGE_SIZE: parseInt(process.env.TRADEMARK_DEFAULT_PAGE_SIZE || '20', 10),
            MAX_PAGE_SIZE: parseInt(process.env.TRADEMARK_MAX_PAGE_SIZE || '100', 10)
        },
        uspto: {
            url: process.env.USPTP_API_URL || 'https://api.uspto.gov',
            key: process.env.USPTP_API_KEY || 'default-key'
        },
        euipo: {
            url: process.env.EUIPO_API_URL || 'https://api.euipo.europa.eu',
            key: process.env.EUIPO_API_KEY || 'default-key'
        }
    }
});

// Enhanced TrademarkSchemas with feature flag considerations
const TrademarkSchemas = {
    niceClasses: z.array(
        z.number()
            .int()
            .min(config.TRADEMARK.NICE_CLASSES.MIN)
            .max(config.TRADEMARK.NICE_CLASSES.MAX)
            .refine(
                (val): val is NiceClassification => 
                    Object.values(NiceClassification).includes(val),
                'Invalid Nice classification'
            )
    )
        .refine(
            classes => classes.every(c => Object.values(NiceClassification).includes(c)),
            'Invalid Nice classification'
        ),

    jurisdiction: z.array(z.enum(['USPTO', 'EUIPO']))
        .default(['USPTO', 'EUIPO']),

    description: z.string()
        .trim()
        .max(1000, 'Description must not exceed 1000 characters')
        .optional(),

    owner: z.object({
        name: z.string().min(1, 'Owner name is required'),
        address: z.string().min(1, 'Owner address is required')
    }),

    // Add new schemas based on feature flags
    similarityThreshold: featureFlags.TRADEMARK.ENABLE_SIMILARITY_CHECK 
        ? z.number().min(0).max(1).default(0.8)
        : z.undefined(),

    fuzzySearchOptions: featureFlags.TRADEMARK.ENABLE_FUZZY_SEARCH
        ? z.object({
            threshold: z.number().min(0).max(1).default(0.6),
            distance: z.number().int().min(1).max(3).default(2)
        })
        : z.undefined()
};

// Base search query schema for raw request validation
const BaseSearchQuerySchema = z.object({
    query: z.string()
        .trim()
        .min(
            config.TRADEMARK.SEARCH.MIN_QUERY_LENGTH,
            `Query must be at least ${config.TRADEMARK.SEARCH.MIN_QUERY_LENGTH} characters`
        )
        .max(
            config.TRADEMARK.SEARCH.MAX_QUERY_LENGTH,
            `Query must not exceed ${config.TRADEMARK.SEARCH.MAX_QUERY_LENGTH} characters`
        )
        .transform(val => val.toLowerCase()),
    
    page: z.string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : 1),
    
    limit: z.string()
        .optional()
        .transform(val => val ? 
            Math.min(parseInt(val, 10), config.TRADEMARK.SEARCH.MAX_PAGE_SIZE) : 
            config.TRADEMARK.SEARCH.DEFAULT_PAGE_SIZE
        ),

    status: z.array(z.nativeEnum(TrademarkStatus))
        .optional(),

    niceClasses: z.array(z.string())
        .optional()
        .transform(val => 
            val?.map(v => parseInt(v, 10))
            .filter((v): v is NiceClassification => 
                Object.values(NiceClassification).includes(v)
            )
        ),

    jurisdiction: z.array(z.enum(['USPTO', 'EUIPO'] as const))
        .optional(),

    sortBy: z.enum(['relevance', 'name', 'registrationDate', 'status', 'owner'])
        .optional(),

    sortOrder: z.enum(['asc', 'desc'])
        .optional()
}).strict();

// Enhanced schema with feature flags
const FeatureFlagSearchSchema = z.object({
    ...(featureFlags.TRADEMARK.ENABLE_SIMILARITY_CHECK && {
        similarityThreshold: TrademarkSchemas.similarityThreshold
    }),
    ...(featureFlags.TRADEMARK.ENABLE_FUZZY_SEARCH && {
        fuzzySearch: TrademarkSchemas.fuzzySearchOptions
    })
}).strict();

// Combined search schema that matches TrademarkSearchParams
export const TrademarkSearchSchema = BaseSearchQuerySchema
    .merge(FeatureFlagSearchSchema)
    .transform((data): TrademarkSearchParams => ({
        query: data.query,
        page: data.page,
        limit: data.limit,
        status: data.status,
        niceClasses: data.niceClasses,
        jurisdiction: data.jurisdiction,
        sortBy: data.sortBy,
        sortOrder: data.sortOrder
    }));

export const validateTrademarkSearch = async (
    query: unknown,
    res: Response,
    _next: NextFunction
): Promise<TrademarkSearchParams | null> => {
    try {
        return TrademarkSearchSchema.parse(query);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.errors
            });
        }
        return null;
    }
};

// Registration validation schema
const TrademarkRegistrationSchema = z.object({
    name: z.string()
        .trim()
        .min(3, 'Name must be at least 3 characters')
        .max(255, 'Name must not exceed 255 characters'),
    
    niceClasses: TrademarkSchemas.niceClasses,
    jurisdiction: TrademarkSchemas.jurisdiction,
    description: TrademarkSchemas.description,
    owner: TrademarkSchemas.owner
}).strict();

export const validateTrademarkRegistration = createValidator(
    TrademarkRegistrationSchema,
    'trademark_registration'
);

// Type exports for use in service layer
export type TrademarkSearchSchemaType = z.infer<typeof TrademarkSearchSchema>;
export type TrademarkRegistrationSchemaType = z.infer<typeof TrademarkRegistrationSchema>;