import { AsyncLocalStorage } from 'async_hooks';
import { Counter, Histogram, Gauge } from 'prom-client';
import { loggers } from '../../observability/contextLoggers';
import { RecommendationError } from '../recommendationengine/data/recommendationDAL';

const logger = loggers.api;

interface RequestContextData {
    correlationId: string;
    startTime: number;
    userId?: string;
    disposed: boolean;
    metadata: {
        userAgent?: string;
        ip?: string;
        route?: string;
    };
    trackingIds?: {
        correlationId?: string;
        sessionId?: string;
    };
}

// Metrics for monitoring context lifecycle. Usage of gauge: we are tracking both increases and decreases.
const contextMetrics = {
    activeContexts: new Gauge({
        name: 'request_context_active_total',
        help: 'Number of active request contexts'
    }),
    contextDuration: new Histogram({
        name: 'request_context_duration_seconds',
        help: 'Duration of request contexts',
        buckets: [0.1, 0.5, 1, 2, 5]
    }),
    contextErrors: new Counter({
        name: 'request_context_errors_total',
        help: 'Number of request context errors',
        labelNames: ['type']
    })
};

/**
 * Manages request-scoped context using AsyncLocalStorage
 * A Thread-safe request tracking, and resource management
 */
export class RequestContext {
    private static storage = new AsyncLocalStorage<RequestContextData>();
    private static readonly CONTEXT_TIMEOUT = 30000; // 30 seconds
    private timer: ReturnType<typeof setTimeout> | null = null;
    private metricsTimer: ReturnType<Histogram['startTimer']>;

    constructor(correlationId: string, metadata?: RequestContextData['metadata']) {
        try {
            const context: RequestContextData = {
                correlationId,
                startTime: Date.now(),
                disposed: false,
                metadata: metadata || {}
            };

            RequestContext.storage.enterWith(context);
            contextMetrics.activeContexts.inc();
            this.metricsTimer = contextMetrics.contextDuration.startTimer();

            logger.info({
                correlationId,
                metadata
            }, 'Request context created');

            // Set cleanup timeout
            this.timer = setTimeout(() => {
                if (!context.disposed) {
                    logger.warn({
                        correlationId,
                        duration: Date.now() - context.startTime
                    }, 'Request context timeout - forcing cleanup');
                    this.clear();
                    contextMetrics.contextErrors.inc({ type: 'timeout' });
                }
            }, RequestContext.CONTEXT_TIMEOUT);

        } catch (error) {
            contextMetrics.contextErrors.inc({ type: 'creation' });
            logger.error({
                error: error instanceof Error ? error.message : 'Unknown error',
                correlationId
            }, 'Failed to create request context');
            throw new RecommendationError('Failed to create request context');
        }
    }

    /**
     * Retrieves current request context
     * Provides access to request-specific data throughout the request lifecycle
     */
    static getCurrentContext(): RequestContextData | undefined {
        try {
            const context = this.storage.getStore();
            if (!context) {
                return undefined;
            }

            if (context.disposed) {
                logger.warn({
                    correlationId: context.correlationId
                }, 'Attempted to access disposed context');
                return undefined;
            }

            return context;
        } catch (error) {
            contextMetrics.contextErrors.inc({ type: 'access' });
            logger.error({
                error: error instanceof Error ? error.message : 'Unknown error'
            }, 'Failed to access request context');
            return undefined;
        }
    }

    /**
     * Cleans up request context
     * Prevents memory leaks and ensures proper resource cleanup, instead of cleaning up to early.
     */
    clear(): void {
        try {
            const context = RequestContext.storage.getStore();
            if (!context) {
                return;
            }

            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }

            if (!context.disposed) {
                context.disposed = true;
                this.metricsTimer();
                contextMetrics.activeContexts.dec();

                logger.info({
                    correlationId: context.correlationId,
                    duration: Date.now() - context.startTime
                }, 'Request context cleared');
            }

            RequestContext.storage.disable();
        } catch (error) {
            contextMetrics.contextErrors.inc({ type: 'cleanup' });
            logger.error({
                error: error instanceof Error ? error.message : 'Unknown error'
            }, 'Failed to clear request context');
        }
    }
}