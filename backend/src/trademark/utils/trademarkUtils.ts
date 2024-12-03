import { TrademarkSearchParams } from '../../../types/trademark';
import crypto from 'crypto';
import { Counter, Histogram } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';

const logger = loggers.trademark;

// Constants.
const CACHE_SEGMENT_MINUTES = 15;

// Metrics for utility functions.
const utilsMetrics = {
  cacheKeyGeneration: new Histogram({
    name: 'trademark_cache_key_generation_duration_seconds',
    help: 'Duration of cache key generation',
    buckets: [0.001, 0.005, 0.01, 0.05]
  }),
  queryNormalization: new Histogram({
    name: 'trademark_query_normalization_duration_seconds',
    help: 'Duration of query normalization',
    buckets: [0.001, 0.005, 0.01, 0.05]
  }),
  errors: new Counter({
    name: 'trademark_utils_errors_total',
    help: 'Total number of errors in trademark utils',
    labelNames: ['function']
  })
};

/**
 * Generates a cache key for trademark search parameters.
 * @param params - Search parameters to generate key from.
 * @returns Unique cache key as string.
 */
export function generateSearchCacheKey(params: Readonly<TrademarkSearchParams>): string {
  const timer = utilsMetrics.cacheKeyGeneration.startTimer();
  try {
    const normalized = {
      ...params,
      query: normalizeTrademarkQuery(params.query),
      timestamp: Math.floor(Date.now() / (1000 * 60 * CACHE_SEGMENT_MINUTES))
    };
    
    const cacheKey = `trademark:search:${crypto
      .createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex')}`;

    logger.debug({ cacheKey }, 'Generated cache key');
    return cacheKey;
  } catch (error) {
    utilsMetrics.errors.inc({ function: 'generateSearchCacheKey' });
    logger.error({ error }, 'Failed to generate cache key');
    throw new Error('Cache key generation failed');
  } finally {
    timer();
  }
}

/**
 * Normalizes a trademark query string.
 * @param query - Query string to normalize.
 * @returns {string} Normalized query string.
 */
export function normalizeTrademarkQuery(query: string): string {
  const timer = utilsMetrics.queryNormalization.startTimer();
  try {
    const normalizedQuery = query.trim().toLowerCase().replace(/[^\w\s-]/g, '');
    logger.debug({ normalizedQuery }, 'Normalized query');
    return normalizedQuery;
  } catch (error) {
    utilsMetrics.errors.inc({ function: 'normalizeTrademarkQuery' });
    logger.error({ error }, 'Failed to normalize query');
    throw new Error('Query normalization failed');
  } finally {
    timer();
  }
}