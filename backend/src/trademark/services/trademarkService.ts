import { 
  Trademark, 
  TrademarkSearchParams, 
  TrademarkResponse,} from '../../../types/trademark';
import { Counter, Histogram } from 'prom-client';
import { Cache } from '../../utils/cache';
import { generateSearchCacheKey, normalizeTrademarkQuery } from '../utils/trademarkUtils';
import { formatTrademarkResponse } from '../utils/responseFormatter';
import { TrademarkError } from '../utils/trademarkError';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { serviceConfig } from '../../utils/env';
import { AsyncLock } from '../../utils/AsyncLock';


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
  }),
  apiLatency: new Histogram({
    name: 'trademark_api_latency_seconds',
    help: 'Latency of trademark API calls',
    labelNames: ['api', 'operation'],
    buckets: [0.1, 0.5, 1, 2, 5]
  })
};

class TrademarkService {
  private readonly cache: Cache;
  private readonly usptoClient: AxiosInstance;
  private readonly euipoClient: AxiosInstance;
  private readonly asyncLock: AsyncLock;

  constructor() {
    this.cache = new Cache();
    
    const { trademark: config } = serviceConfig;
    
    this.usptoClient = axios.create({
      baseURL: config.uspto.url,
      timeout: 5000,
      headers: { 'X-API-Key': config.uspto.key }
    });

    this.euipoClient = axios.create({
      baseURL: config.euipo.url,
      timeout: 5000,
      headers: { 'X-API-Key': config.euipo.key }
    });

    this.asyncLock = new AsyncLock();

    this.setupAxiosInterceptors();
  }

  private setupAxiosInterceptors(): void {
    const setupMetrics = (client: AxiosInstance, apiName: string) => {
      client.interceptors.request.use((config) => {
        if (config) {
          config.metadata = { startTime: Date.now() };
        }
        return config;
      });

      client.interceptors.response.use(
        (response) => {
          const duration = (Date.now() - (response.config?.metadata?.startTime ?? Date.now())) / 1000;
          trademarkMetrics.apiLatency.observe(
            { api: apiName, operation: 'success' },
            duration
          );
          return response;
        },
        (error: AxiosError) => {
          if (error.config) {
            const duration = (Date.now() - (error.config?.metadata?.startTime ?? Date.now())) / 1000;
            trademarkMetrics.apiLatency.observe(
              { api: apiName, operation: 'error' },
              duration
            );
          }
          throw error;
        }
      );
    };

    setupMetrics(this.usptoClient, 'USPTO');
    setupMetrics(this.euipoClient, 'EUIPO');
  }

  async searchTrademark(params: Readonly<TrademarkSearchParams>): Promise<TrademarkResponse> {
    await this.asyncLock.acquire('trademark-search');
    try {
      const timer = trademarkMetrics.searchDuration.startTimer();
      const jurisdiction = params.jurisdiction?.join(',') || 'all';
      
      try {
        trademarkMetrics.operations.inc({ 
          operation: 'search', 
          status: 'attempt',
          jurisdiction
        });

        const normalizedParams = {
          ...params,
          query: normalizeTrademarkQuery(params.query || '')
        };

        const cacheKey = generateSearchCacheKey(normalizedParams);
        const cachedResult = await this.cache.get<TrademarkResponse>(cacheKey);
        
        if (cachedResult) {
          trademarkMetrics.operations.inc({ 
            operation: 'search', 
            status: 'cache_hit',
            jurisdiction
          });
          return cachedResult;
        }

        const results = await this.searchAllRegistries(normalizedParams);
        const formattedResults: Trademark = {
          id: crypto.randomUUID(),
          name: normalizedParams.query,
          status: 'ACTIVE',
          applicationNumber: '',
          registrationNumber: '',
          filingDate: new Date(),
          registrationDate: null,
          expirationDate: null,
          owner: {
            name: '',
            address: ''
          },
          results
        };

        const response = formatTrademarkResponse(formattedResults);
        
        await this.cache.set(cacheKey, response, { service: 'trademark' });
        
        trademarkMetrics.operations.inc({ 
          operation: 'search', 
          status: 'success',
          jurisdiction
        });

        return response;

      } catch (error) {
        trademarkMetrics.operations.inc({ 
          operation: 'search', 
          status: 'error',
          jurisdiction
        });
        throw TrademarkError.fromUnknown(error);
      } finally {
        timer();
      }
    } finally {
      this.asyncLock.release('trademark-search');
    }
  }

  private async searchAllRegistries(params: TrademarkSearchParams): Promise<Trademark[]> {
    const searchPromises: Promise<Trademark[]>[] = [];
    const jurisdictions = params.jurisdiction || ['USPTO', 'EUIPO'];
    
    const searchFunctions = {
      USPTO: () => this.searchUSPTO(params),
      EUIPO: () => this.searchEUIPO(params)
    };

    const results = await Promise.allSettled(
      jurisdictions.map(j => searchFunctions[j]())
    );

    return results
      .filter((result): result is PromiseFulfilledResult<Trademark[]> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
      .flat();
  }

  private async searchUSPTO(params: TrademarkSearchParams): Promise<Trademark[]> {
    try {
      const response = await this.usptoClient.get('/trademarks/search', {
        params: {
          q: params.q,
          classes: params.niceClasses?.join(','),
          page: params.page,
          limit: params.limit
        }
      });
      return response.data;
    } catch (error) {
      throw new TrademarkError(
        'USPTO_SEARCH_ERROR',
        'Failed to search USPTO trademarks',
        error
      );
    }
  }

  private async searchEUIPO(params: TrademarkSearchParams): Promise<Trademark[]> {
    try {
      const response = await this.euipoClient.get('/trademarks/search', {
        params: {
          query: params.q,
          nice_classes: params.niceClasses?.join(','),
          page: params.page,
          per_page: params.limit
        }
      });
      return response.data;
    } catch (error) {
      throw new TrademarkError(
        'EUIPO_SEARCH_ERROR',
        'Failed to search EUIPO trademarks',
        error
      );
    }
  }
}

// Export singleton instance
export const trademarkService = new TrademarkService();