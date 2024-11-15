import { 
  Trademark, 
  TrademarkSearchParams, 
  TrademarkResponse, 
  TrademarkError, 
  TrademarkErrorCode,
  TrademarkStatus,
  TrademarkClass
} from '../../../types/trademark';
import { Counter, Histogram } from 'prom-client';
import { Cache } from '../../utils/cache';
import { env } from '../../config/env';
import axios from 'axios';

// Enhanced metrics
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
  }),
  monitoringAlerts: new Counter({
    name: 'trademark_monitoring_alerts_total',
    help: 'Total number of trademark monitoring alerts',
    labelNames: ['type', 'jurisdiction']
  })
};

class TrademarkService {
  private readonly cache: Cache;
  private readonly usptoApiClient: axios.InstanceType;
  private readonly euipoApiClient: axios.InstanceType;

  constructor() {
    this.cache = new Cache('trademark');
    
    this.usptoApiClient = axios.create({
      baseURL: env.USPTO_API_URL,
      headers: { 'X-API-Key': env.USPTO_API_KEY }
    });

    this.euipoApiClient = axios.create({
      baseURL: env.EUIPO_API_URL,
      headers: { 
        'X-API-Key': env.EUIPO_API_KEY,
        'X-API-Secret': env.EUIPO_API_SECRET
      }
    });
  }

  async searchTrademark(params: TrademarkSearchParams): Promise<TrademarkResponse> {
    const timer = trademarkMetrics.searchDuration.startTimer();
    
    try {
      trademarkMetrics.operations.inc({ 
        operation: 'search', 
        status: 'attempt',
        jurisdiction: params.jurisdiction?.join(',') || 'all'
      });

      const cacheKey = this.generateCacheKey(params);
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
      const response: TrademarkResponse = {
        success: true,
        data: results,
        similarMarks: await this.findSimilarMarks(results),
        metadata: {
          requestId: crypto.randomUUID(),
          timestamp: new Date(),
          path: '/api/trademark/search'
        }
      };

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

      throw this.handleError(error);
    } finally {
      timer();
    }
  }

  private generateCacheKey(params: TrademarkSearchParams): string {
    return `trademark:${JSON.stringify(params)}`;
  }

  private async searchAllRegistries(params: TrademarkSearchParams): Promise<Trademark[]> {
    const searchPromises = [];
    
    if (!params.jurisdiction || params.jurisdiction.includes('USPTO')) {
      searchPromises.push(this.searchUSPTO(params));
    }
    
    if (!params.jurisdiction || params.jurisdiction.includes('EUIPO')) {
      searchPromises.push(this.searchEUIPO(params));
    }

    const results = await Promise.all(searchPromises);
    return results.flat();
  }

  private handleError(error: any): TrademarkError {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        return {
          code: TrademarkErrorCode.QUOTA_EXCEEDED,
          message: 'API rate limit exceeded'
        };
      }
      return {
        code: TrademarkErrorCode.API_ERROR,
        message: error.message
      };
    }
    
    return {
      code: TrademarkErrorCode.VALIDATION_ERROR,
      message: 'Invalid request parameters'
    };
  }
}

export const trademarkService = new TrademarkService();

