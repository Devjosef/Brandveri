import { Request } from 'express';
import { RecommendationError } from '../recommendationengine/data/recommendationDAL';
import sanitizeHtml from 'sanitize-html';
import { recommendationSchema } from '../recommendationengine/utils/helperFunctions';
import { Counter, Histogram } from 'prom-client';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.api;

// Security metrics
const securityMetrics = {
    validationAttempts: new Counter({
        name: 'request_validation_attempts_total',
        help: 'Total number of request validation attempts',
        labelNames: ['status', 'type']
    }),
    sanitizationDuration: new Histogram({
        name: 'request_sanitization_duration_seconds',
        help: 'Duration of request sanitization',
        buckets: [0.01, 0.05, 0.1, 0.5, 1]
    })
};

/**
 * Enhanced security for request validation
 * Prevents DoS attacks through large payloads.
 */
export function validatePayloadSize(req: Request, maxSize: number): void {
    const size = parseInt(req.get('content-length') || '0', 10);
    if (size <= 0 || size > maxSize) {
        securityMetrics.validationAttempts.inc({ status: 'failed', type: 'size' });
        logger.warn({ size, maxSize }, 'Payload size validation failed');
        throw new RecommendationError(`Invalid payload size: ${size} bytes`);
    }
    securityMetrics.validationAttempts.inc({ status: 'success', type: 'size' });
}

/**
 * Secure request sanitization
 * Prevents XSS, prototype pollution, and JSON injection
 */
export function sanitizeRequest(body: unknown): Record<string, unknown> {
    const timer = securityMetrics.sanitizationDuration.startTimer();
    
    try {
        if (!body || typeof body !== 'object') {
            throw new RecommendationError('Invalid request body');
        }

        // Deep clone with security checks
        const sanitized = JSON.parse(JSON.stringify(body, (key, value) => {
            // Prevent prototype pollution
            if (key.startsWith('__proto__') || key.startsWith('constructor')) {
                logger.warn({ key }, 'Potential prototype pollution attempt detected');
                return undefined;
            }
            // Sanitize string values
            if (typeof value === 'string') {
                return sanitizeHtml(value, {
                    allowedTags: [],      // No HTML allowed
                    allowedAttributes: {} // No attributes allowed
                });
            }
            return value;
        }));

        // Validate object depth and types
        validateObjectDepth(sanitized);
        validateDataTypes(sanitized);

        // Use Zod schema for final validation
        recommendationSchema.parse(sanitized);

        timer();
        securityMetrics.validationAttempts.inc({ status: 'success', type: 'sanitization' });
        return sanitized;
    } catch (error) {
        timer();
        securityMetrics.validationAttempts.inc({ status: 'failed', type: 'sanitization' });
        logger.error({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, 'Request sanitization failed');
        
        throw new RecommendationError(
            error instanceof Error ? 
            `Request sanitization failed: ${error.message}` : 
            'Request sanitization failed'
        );
    }
}

// From our Helper functions remains the same here, but with added logging
function validateObjectDepth(obj: unknown, depth = 0, maxDepth = 5): void {
    if (depth >= maxDepth) {
        logger.warn({ depth, maxDepth }, 'Object depth validation failed');
        throw new RecommendationError('Object nesting too deep');
    }
    if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(value => {
            validateObjectDepth(value, depth + 1, maxDepth);
        });
    }
}

function validateDataTypes(obj: Record<string, unknown>): void {
    const allowedTypes = ['string', 'number', 'boolean'];
    Object.values(obj).forEach(value => {
        if (typeof value === 'object' && value !== null) {
            validateDataTypes(value as Record<string, unknown>);
        } else if (!allowedTypes.includes(typeof value)) {
            logger.warn({ type: typeof value }, 'Data type validation failed');
            throw new RecommendationError(`Invalid data type: ${typeof value}`);
        }
    });
}