import { TrademarkSearchParams } from '../../../types/trademark';
import crypto from 'crypto';

// Constants
const CACHE_SEGMENT_MINUTES = 15;

/**
 * Generates a cache key for trademark search parameters
 * @param params - Search parameters to generate key from
 * @returns Unique cache key as string
 */
export function generateSearchCacheKey(params: Readonly<TrademarkSearchParams>): string {
  const normalized = {
    ...params,
    query: normalizeTrademarkQuery(params.query),
    timestamp: Math.floor(Date.now() / (1000 * 60 * CACHE_SEGMENT_MINUTES))
  };
  
  return `trademark:search:${crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')}`;
}

/**
 * Normalizes a trademark query string
 * @param query - Query string to normalize
 * @returns {string} Normalized query string
 */
export function normalizeTrademarkQuery(query: string): string {
  return query.trim().toLowerCase().replace(/[^\w\s-]/g, '');
}