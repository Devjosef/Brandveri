import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendationService';
import { loggers } from '../../../observability/contextLoggers';
import { recommendationSchema } from '../utils/helperFunctions';
import { RecommendationError, CacheError } from '../data/recommendationDAL';
import { Counter, Histogram } from 'prom-client';
import crypto from 'crypto';
import { validatePayloadSize, sanitizeRequest } from '../../utils/requestValidators';
import { CircuitBreaker } from '../../utils/CircuitBreaker';
import { RequestContext } from '../../utils/requestContext';
import { RecommendationRequest } from '../../../types/recommendationEngine';



const MAX_PAYLOAD_SIZE = 1024 * 100; // 100KB
const REQUEST_TIMEOUT = 30000; // 30 seconds

const controllerBreaker = new CircuitBreaker('controller', {
    failureThreshold: 5,
    resetTimeout: 60000,
    healthCheckInterval: 5000, 
    maxConcurrent: 10 
});

const logger = loggers.recommendation;

const controllerMetrics = {
    requestDuration: new Histogram({
        name: 'recommendation_http_duration_seconds',
        help: 'Duration of HTTP recommendation requests',
        labelNames: ['status'],
        buckets: [0.1, 0.5, 1, 2, 5]
    }),
    requests: new Counter({
        name: 'recommendation_http_requests_total',
        help: 'Total number of HTTP recommendation requests',
        labelNames: ['status', 'error_type']
    })
};

/**
 * Handles HTTP layer for recommendation requests
 * - Separates HTTP concerns from business logic.
 * - Provides consistent error handling and response formatting.
 * - Enables request-level metrics collection.
 */
class RecommendationController {
    /**
     * Processes recommendation requests
     * - Handles long-running service operations without blocking.
     * - Properly propagates errors from service layer.
     * - Maintains connection stability.
     */
    public async getRecommendations(req: Request, res: Response): Promise<void> {
        const correlationId = crypto.randomUUID();
        const timer = controllerMetrics.requestDuration.startTimer();
        const context = new RequestContext(correlationId);

        // Set security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Correlation-ID', correlationId);

        try {
            // Validate request size and structure
            validatePayloadSize(req, MAX_PAYLOAD_SIZE);
            const sanitizedBody = sanitizeRequest(req.body);

            // Set request timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT);
            });

            const validatedRequest = await Promise.race([
                recommendationSchema.parseAsync({
                    ...sanitizedBody,
                    userId: req.user?.id ?? '',
                    trademarkId: (sanitizedBody as Partial<RecommendationRequest>).trademarkId || correlationId
                }) as Promise<RecommendationRequest>,
                timeoutPromise
            ]) as RecommendationRequest;

            const response = await controllerBreaker.execute(() => 
                recommendationService.getRecommendations(validatedRequest)
            );

            controllerMetrics.requests.inc({ status: 'success' });
            timer({ status: 'success' });

            res.status(200).json({
                success: true,
                data: response,
                metadata: {
                    processedAt: new Date().toISOString(),
                    requestId: validatedRequest.trademarkId,
                    totalResults: response.recommendations.length
                }
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error occurred');
            
            logger.error({ 
                error: error.message,
                stack: error.stack,
                correlationId,
                requestSize: req.get('content-length'),
                path: req.path
            }, 'Recommendation request failed');

            timer({ status: 'error' });

            // Handle specific error types from the service layer.
            if (error.name === 'ZodError') {
                controllerMetrics.requests.inc({ status: 'error', error_type: 'validation' });
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.message
                });
                return;
            }

            if (error instanceof RecommendationError) {
                controllerMetrics.requests.inc({ status: 'error', error_type: 'business' });
                res.status(422).json({
                    success: false,
                    error: 'Processing failed',
                    message: error.message
                });
                return;
            }

            if (error instanceof CacheError) {
                controllerMetrics.requests.inc({ status: 'error', error_type: 'cache' });
                // Don't expose cache errors to client
                res.status(503).json({
                    success: false,
                    error: 'Service temporarily unavailable',
                    message: 'Please try again later'
                });
                return;
            }

            controllerMetrics.requests.inc({ status: 'error', error_type: 'internal' });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'An unexpected error occurred'
            });
        } finally {
            context.clear();
        }
    }
}

export default new RecommendationController();