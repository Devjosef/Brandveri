import { Counter, Histogram } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';
import { cacheService } from '../../utils/cache';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { AsyncLock } from '../utils/asyncLock';

const logger = loggers.recommendation;

export class RecommendationError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'RecommendationError';
    }
}

export class BrandNameGenerationError extends RecommendationError {}
export class MemoryThresholdError extends RecommendationError {}
export class CacheError extends RecommendationError {}

const brandMetrics = {
    generationDuration: new Histogram({
        name: 'brand_generation_duration_seconds',
        help: 'Duration of brand name generation',
        labelNames: ['status'],
        buckets: [0.1, 0.5, 1, 2, 5]
    }),
    operations: new Counter({
        name: 'brand_operations_total',
        help: 'Total number of brand operations',
        labelNames: ['operation', 'status']
    })
};

class RecommendationDAL {
    private static readonly CONFIG = {
        BATCH_SIZE: 1000,
        CACHE_TTL: 3600,
        FAILURE_THRESHOLD: 3,
        MEMORY_THRESHOLD: 100 * 1024 * 1024,
        RESET_TIMEOUT_MS: 30000,
        MAX_ITERATIONS: 100000,
        NAME_LENGTH: {
            MIN: 4,
            MAX: 7
        }
    } as const;

    private readonly breaker: CircuitBreaker;
    private readonly mutex: AsyncLock;

    constructor() {
        this.breaker = new CircuitBreaker('brandNameGeneration', {
            failureThreshold: RecommendationDAL.CONFIG.FAILURE_THRESHOLD,
            resetTimeout: RecommendationDAL.CONFIG.RESET_TIMEOUT_MS
        });
        this.mutex = new AsyncLock();
    }

    public async generateBrandNames(): Promise<string[]> {
        const startTime = Date.now();
        const cacheKey = `brandNames:${RecommendationDAL.CONFIG.BATCH_SIZE}`;

        try {
            const cachedNames = await cacheService.get<string[]>(cacheKey, {
                service: 'recommendation'
            });

            if (cachedNames) {
                brandMetrics.operations.inc({ operation: 'cache', status: 'hit' });
                return cachedNames;
            }

            try {
                const waitedNames = await this.waitForCache();
                if (waitedNames) {
                    brandMetrics.operations.inc({ operation: 'cache', status: 'wait_hit' });
                    return waitedNames;
                }
            } catch (error) {
                logger.debug('Cache wait timeout, proceeding with generation');
            }

            return this.breaker.execute(async () => {
                try {
                    await this.mutex.acquire('brandNames');
                    const names = await this.generateNamesWithMemoryCheck();

                    await cacheService.set(cacheKey, names, {
                        ttl: RecommendationDAL.CONFIG.CACHE_TTL,
                        service: 'recommendation'
                    });

                    const duration = (Date.now() - startTime) / 1000;
                    brandMetrics.generationDuration.observe({ status: 'success' }, duration);
                    return names;
                } finally {
                    this.mutex.release('brandNames');
                }
            });
        } catch (error) {
            brandMetrics.operations.inc({ operation: 'generation', status: 'error' });
            logger.error({ error, duration: Date.now() - startTime }, 'Failed to generate brand names');
            throw new BrandNameGenerationError('Failed to generate brand names', error);
        }
    }

    private async waitForCache(attempts = 0): Promise<string[]> {
        const maxAttempts = 5;
        const cacheKey = `brandNames:BATCH_SIZE_${RecommendationDAL.CONFIG.BATCH_SIZE}`;

        if (attempts >= maxAttempts) {
            throw new Error('Maximum retry attempts reached waiting for cache');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const cachedNames = await cacheService.get<string[]>(cacheKey, {
            service: 'recommendation'
        });

        if (cachedNames) {
            logger.info('Successfully retrieved from cache after waiting');
            return cachedNames;
        }

        return this.waitForCache(attempts + 1);
    }

    private async generateNamesWithMemoryCheck(): Promise<string[]> {
        const names = new Set<string>();
        let memoryUsage = process.memoryUsage().heapUsed;

        for (const name of this.nameGenerator()) {
            const currentMemory = process.memoryUsage().heapUsed - memoryUsage;
            if (currentMemory >= RecommendationDAL.CONFIG.MEMORY_THRESHOLD) {
                throw new MemoryThresholdError('Memory threshold exceeded during name generation');
            }
            
            names.add(name);
            if (names.size >= RecommendationDAL.CONFIG.BATCH_SIZE) break;
        }

        return Array.from(names);
    }

    private *nameGenerator(): Generator<string> {
        let iterations = 0;
        const vowels = ['a', 'e', 'i', 'o', 'u'];
        const consonants = 'bcdfghjklmnpqrstvwxyz'.split('');

        while (iterations < RecommendationDAL.CONFIG.MAX_ITERATIONS) {
            iterations++;
            const length = Math.floor(Math.random() * 
                (RecommendationDAL.CONFIG.NAME_LENGTH.MAX - RecommendationDAL.CONFIG.NAME_LENGTH.MIN + 1)) + 
                RecommendationDAL.CONFIG.NAME_LENGTH.MIN;

            let name = '';
            for (let j = 0; j < length; j++) {
                name += j % 2 === 0 
                    ? consonants[Math.floor(Math.random() * consonants.length)]
                    : vowels[Math.floor(Math.random() * vowels.length)];
            }

            yield name.charAt(0).toUpperCase() + name.slice(1);
        }

        logger.warn('Maximum iterations reached in nameGenerator');
        throw new Error('Maximum iterations reached in name generation');
    }
}

export const recommendationDAL = new RecommendationDAL();