import { cacheWrapper, CacheServiceName } from '../../cache/cacheWrapper';
import { loggers } from '../../observability/contextLoggers';
import { Counter, Histogram } from 'prom-client';

const logger = loggers.system;

/**
 * Service-specific metrics to augment core cache metrics.
 */
const serviceMetrics = {
    operations: new Counter({
        name: 'service_cache_operations_total',
        help: 'Service-specific cache operations',
        labelNames: ['operation', 'status', 'service']
    }),
    duration: new Histogram({
        name: 'service_cache_duration_seconds',
        help: 'Service-specific cache duration',
        labelNames: ['operation', 'service'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1]
    })
};

/**
 * Service-specific cache wrapper:
 * - Closer to service implementation
 * - Service-specific cache patterns
 * - Reuses production cache infrastructure
 */
export class ServiceCache {
    constructor(
        private readonly service: CacheServiceName,
        private readonly defaultTTL: number = 3600
    ) {}

    async get<T>(key: string): Promise<T | null> {
        const timer = serviceMetrics.duration.startTimer({ 
            operation: 'get',
            service: this.service 
        });
        
        try {
            const result = await cacheWrapper.get<T>(key, {
                service: this.service
            });
            
            serviceMetrics.operations.inc({
                operation: 'get',
                status: result ? 'hit' : 'miss',
                service: this.service
            });
            
            return result;
        } catch (error) {
            serviceMetrics.operations.inc({
                operation: 'get',
                status: 'error',
                service: this.service
            });
            logger.warn({ error, key }, 'Cache get failed, continuing without cache');
            return null;
        } finally {
            timer();
        }
    }

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        const timer = serviceMetrics.duration.startTimer({ 
            operation: 'set',
            service: this.service 
        });
        
        try {
            await cacheWrapper.set(key, value, {
                ttl: ttl || this.defaultTTL,
                service: this.service
            });
            
            serviceMetrics.operations.inc({
                operation: 'set',
                status: 'success',
                service: this.service
            });
        } catch (error) {
            serviceMetrics.operations.inc({
                operation: 'set',
                status: 'error',
                service: this.service
            });
            logger.warn({ error, key }, 'Cache set failed');
        } finally {
            timer();
        }
    }

    async invalidate(key: string): Promise<void> {
        const timer = serviceMetrics.duration.startTimer({ 
            operation: 'invalidate',
            service: this.service 
        });
        
        try {
            await cacheWrapper.del(key, {
                service: this.service
            });
            
            serviceMetrics.operations.inc({
                operation: 'invalidate',
                status: 'success',
                service: this.service
            });
        } catch (error) {
            serviceMetrics.operations.inc({
                operation: 'invalidate',
                status: 'error',
                service: this.service
            });
            logger.warn({ error, key }, 'Cache invalidation failed');
        } finally {
            timer();
        }
    }
}

// Export service-specific instances
export const trademarkCache = new ServiceCache('trademark');
export const paymentCache = new ServiceCache('payment');
export const copyrightCache = new ServiceCache('copyright');
export const recommendationCache = new ServiceCache('recommendation');
