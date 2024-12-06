import { z } from 'zod';
import { AuthError } from '../../../auth/utils/AuthError';
import { Counter, Histogram } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';

const logger = loggers.copyright;

/**
 * Metrics for validation operations following established patterns.
 */
const validationMetrics = {
    operations: new Counter({
        name: 'copyright_validation_operations_total',
        help: 'Total number of copyright validation operations',
        labelNames: ['operation', 'status', 'type']
    }),
    duration: new Histogram({
        name: 'copyright_validation_duration_seconds',
        help: 'Duration of copyright validation operations',
        labelNames: ['operation', 'type'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1]
    })
};

/**
 * Core validation schema for copyright registration.
 * Following established patterns for formal specification.
 */
export const CopyrightRegistrationSchema = z.object({
    title: z.string()
        .min(1, 'Title is required')
        .max(255)
        .transform(str => str.trim()),
    author: z.string()
        .min(1, 'Author is required')
        .max(255)
        .transform(str => str.trim()),
    registration_number: z.string()
        .min(1, 'Registration number is required')
        .regex(/^[A-Za-z0-9-]+$/, 'Invalid registration number format'),
    registration_date: z.string()
        .transform((str, ctx) => {
            const date = new Date(str);
            if (isNaN(date.getTime())) {
                ctx.addIssue({
                    code: z.ZodIssueCode.invalid_date,
                    message: 'Invalid date format'
                });
                return z.NEVER;
            }
            return date;
        })
        .transform(date => date.toISOString()),
    status: z.string().optional(),
    country: z.string().optional()
}).strict();

/**
 * Validates copyright registration data.
 * Following principles for explicit error handling
 */
export const validateCopyrightRegistration = async (data: unknown) => {
    const timer = validationMetrics.duration.startTimer();
    
    try {
        validationMetrics.operations.inc({ 
            operation: 'validate', 
            status: 'attempt',
            type: 'registration' 
        });

        const result = await CopyrightRegistrationSchema.parseAsync(data);
        
        validationMetrics.operations.inc({ 
            operation: 'validate', 
            status: 'success',
            type: 'registration' 
        });
        
        return result;
    } catch (error) {
        validationMetrics.operations.inc({ 
            operation: 'validate', 
            status: 'error',
            type: 'registration' 
        });

        logger.warn({ error, data }, 'Copyright validation failed');

        if (error instanceof z.ZodError) {
            throw new AuthError(
                400,
                error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '),
                'VALIDATION_ERROR'
            );
        }
        throw error;
    } finally {
        timer({ operation: 'validate', type: 'registration' });
    }
};

/**
 * Search params validation schema.
 */
export const CopyrightSearchSchema = z.object({
    query: z.string().min(1, 'Search query is required'),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(10)
}).strict();

export const validateSearchParams = async (data: unknown) => {
    const timer = validationMetrics.duration.startTimer();
    
    try {
        validationMetrics.operations.inc({ 
            operation: 'validate', 
            status: 'attempt',
            type: 'search' 
        });

        const result = await CopyrightSearchSchema.parseAsync(data);
        
        validationMetrics.operations.inc({ 
            operation: 'validate', 
            status: 'success',
            type: 'search' 
        });
        
        return result;
    } catch (error) {
        validationMetrics.operations.inc({ 
            operation: 'validate', 
            status: 'error',
            type: 'search' 
        });

        logger.warn({ error, data }, 'Search params validation failed');

        if (error instanceof z.ZodError) {
            throw new AuthError(
                400,
                error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '),
                'VALIDATION_ERROR'
            );
        }
        throw error;
    } finally {
        timer({ operation: 'validate', type: 'search' });
    }
};