import { 
  Trademark, 
  TrademarkSearchParams, 
  TrademarkResponse, 
  TrademarkError, 
  TrademarkErrorCode,
  TrademarkStatus,
  JurisdictionType
} from '../../../types/trademark';
import { Counter, Histogram } from 'prom-client';
import { Cache } from '../../utils/cache';
import { generateSearchCacheKey, normalizeTrademarkQuery } from '../utils/trademarkUtils';
import { formatTrademarkResponse } from '../utils/responseFormatter';
import { TrademarkError } from '../utils/trademarkError';
import axios, { AxiosInstance } from 'axios';
import { env } from '../../config/env';

// Metrics for trademark operations
const trademarkMetrics = {
  operations: new Counter({
    name: 'trademark_operations_total',
    help: 'Total number of trademark operations',
    labelNames: ['operation', 'status', 'jurisdiction']
  }),
  searchDuration: new Histogram({
    name: 'trademark_search_duration_seconds',
    help: 'Duration of trademark search operations',
    labelNames: ['jurisdiction'],
    buckets: [0.1, 0.5, 1, 2, 5]
  })
};

class TrademarkService {
  private readonly cache: Cache;
  private readonly usptoClient: AxiosInstance;
  private readonly euipoClient: AxiosInstance;

  constructor() {
    this.cache = new Cache();
    this.usptoClient = axios.create({
      baseURL: env.USPTO_API_URL,
      timeout: 5000,
      headers: { 'X-API-Key': env.USPTO_API_KEY }
    });
    this.euipoClient = axios.create({
      baseURL: env.EUIPO_API_URL,
      timeout: 5000,
      headers: { 'X-API-Key': env.EUIPO_API_KEY }
    });
  }

  async searchTrademark(params: Readonly<TrademarkSearchParams>): Promise<TrademarkResponse> {
    const timer = trademarkMetrics.searchDuration.startTimer();
    
    try {
      trademarkMetrics.operations.inc({ 
        operation: 'search', 
        status: 'attempt',
        jurisdiction: params.jurisdiction?.join(',') || 'all'
      });

      const cacheKey = generateSearchCacheKey(params);
      const cachedResult = await this.cache.get<TrademarkResponse>(cacheKey);
      
      if (cachedResult) {
        trademarkMetrics.operations.inc({ 
          operation: 'search', 
          status: 'cache_hit',
          jurisdiction: params.jurisdiction?.join(',') || 'all'
        });
        return cachedResult;
      }

      const results = await this.searchAllRegistries(params);
      const response = formatTrademarkResponse(results);
      
      await this.cache.set(cacheKey, response);
      
      trademarkMetrics.operations.inc({ 
        operation: 'search', 
        status: 'success',
        jurisdiction: params.jurisdiction?.join(',') || 'all'
      });

      return response;

    } catch (error) {
      trademarkMetrics.operations.inc({ 
        operation: 'search', 
        status: 'error',
        jurisdiction: params.jurisdiction?.join(',') || 'all'
      });
      throw TrademarkError.fromUnknown(error);
    } finally {
      timer();
    }
  }

  private async searchAllRegistries(params: TrademarkSearchParams): Promise<Trademark[]> {
    const searchPromises: Promise<Trademark[]>[] = [];
    
    if (!params.jurisdiction || params.jurisdiction.includes('USPTO')) {
      searchPromises.push(this.searchUSPTO(params));
    }
    
    if (!params.jurisdiction || params.jurisdiction.includes('EUIPO')) {
      searchPromises.push(this.searchEUIPO(params));
    }

    const results = await Promise.all(searchPromises);
    return results.flat();
  }

  private async searchUSPTO(params: TrademarkSearchParams): Promise<Trademark[]> {
    // USPTO API implementation
    return [];
  }

  private async searchEUIPO(params: TrademarkSearchParams): Promise<Trademark[]> {
    // EUIPO API implementation
    return [];
  }
}

export const trademarkService = new TrademarkService();