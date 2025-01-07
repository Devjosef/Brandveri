import https from 'https';
import { URL } from 'url';
import { 
  Trademark, 
  TrademarkSearchParams, 
  TrademarkResponse,
  TrademarkStatus,
  TrademarkErrorCode
} from '../../../types/trademark';
import { Counter, Histogram } from 'prom-client';
import { trademarkCache } from '../../utils/cache';
import { generateSearchCacheKey, normalizeTrademarkQuery } from '../utils/trademarkUtils';
import { formatTrademarkResponse } from '../utils/responseFormatter';
import { TrademarkError } from '../utils/trademarkError';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { config, featureFlags } from '../utils/validation';
import { AsyncLock } from '../../utils/AsyncLock';
import { loggers } from '../../../observability/contextLoggers';


const logger = loggers.trademark;

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
  private readonly usptoClient: AxiosInstance;
  private readonly euipoClient: AxiosInstance;
  private readonly asyncLock: AsyncLock;

  constructor() {
    const trademarkConfig = config.TRADEMARK;
    
    this.usptoClient = axios.create({
      baseURL: trademarkConfig.uspto.url,
      timeout: 5000,
      headers: { 'X-API-Key': trademarkConfig.uspto.key }
    });

    this.euipoClient = axios.create({
      baseURL: trademarkConfig.euipo.url,
      timeout: 5000,
      headers: { 'X-API-Key': trademarkConfig.euipo.key }
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
          logger.error({ error, api: apiName }, 'API call failed');
          throw error;
        }
      );
    };

    setupMetrics(this.usptoClient, 'USPTO');
    setupMetrics(this.euipoClient, 'EUIPO');
  }

  async searchTrademark(params: Readonly<TrademarkSearchParams>): Promise<TrademarkResponse> {
    const searchPromises: Promise<Trademark[]>[] = [];
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
        const cachedResult = await trademarkCache.get<TrademarkResponse>(cacheKey);
        
        if (cachedResult) {
          trademarkMetrics.operations.inc({ 
            operation: 'search', 
            status: 'cache_hit',
            jurisdiction
          });
          return cachedResult;
        }

        let trademarkResults: Trademark[] = [];

        // Use searchPromises for concurrent registry searches
        if (featureFlags.TRADEMARK.ENABLE_CONCURRENT_SEARCH) {
          const jurisdictions = params.jurisdiction || ['USPTO', 'EUIPO'];
          jurisdictions.forEach(j => {
            if (j === 'USPTO') searchPromises.push(this.searchUSPTO(normalizedParams));
            if (j === 'EUIPO') searchPromises.push(this.searchEUIPO(normalizedParams));
          });
          const searchResults = await Promise.all(searchPromises);
          trademarkResults = searchResults.flat();
        } else {
          trademarkResults = await this.searchAllRegistries(normalizedParams);
        }

        const formattedResults: Trademark = {
          id: crypto.randomUUID(),
          name: normalizedParams.query,
          status: TrademarkStatus.PENDING,
          applicationNumber: '',
          registrationNumber: '',
          filingDate: new Date(),
          registrationDate: new Date(),
          expiryDate: new Date(),
          owner: {
            name: '',
            address: '',
            type: 'individual'
          },
          niceClasses: normalizedParams.niceClasses || [],
          jurisdiction: normalizedParams.jurisdiction?.[0] || 'USPTO',
          description: '',
          goods_services: trademarkResults.map(r => r.name),
          lastUpdated: new Date()
        };

        const response = formatTrademarkResponse(formattedResults);
        
        await trademarkCache.set(cacheKey, response, config.TRADEMARK.CACHE_TTL);
        
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
        logger.error({ error, jurisdiction }, 'Trademark search failed');
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
    
    jurisdictions.forEach(j => {
      if (j === 'USPTO') searchPromises.push(this.searchUSPTO(params));
      if (j === 'EUIPO') searchPromises.push(this.searchEUIPO(params));
    });

    const results = await Promise.allSettled(searchPromises);

    return results
      .filter((result): result is PromiseFulfilledResult<Trademark[]> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
      .flat();
  }

  private async makeHttpRequest(url: string, options: https.RequestOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        ...options,
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        timeout: 5000,
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new TrademarkError(
              TrademarkErrorCode.API_ERROR,
              'Invalid JSON response'
            ));
          }
        });
      });

      req.on('error', (error) => {
        reject(new TrademarkError(
          TrademarkErrorCode.API_ERROR,
          'HTTP request failed',
          error
        ));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new TrademarkError(
          TrademarkErrorCode.API_ERROR,
          'Request timeout'
        ));
      });

      req.end();
    });
  }

  private async searchUSPTO(params: TrademarkSearchParams): Promise<Trademark[]> {
    try {
      const response = await this.makeHttpRequest(
        `${config.TRADEMARK.uspto.url}/trademarks/search`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': config.TRADEMARK.uspto.key,
            'Accept': 'application/json'
          }
        }
      );
      return response;
    } catch (error) {
      logger.error({ error, params }, 'USPTO search failed');
      throw new TrademarkError(
        TrademarkErrorCode.API_ERROR,
        'Failed to search USPTO trademarks',
        error
      );
    }
  }

  private async searchEUIPO(params: TrademarkSearchParams): Promise<Trademark[]> {
    try {
      const response = await this.euipoClient.get('/trademarks/search', {
        params: {
          query: params.query,
          nice_classes: params.niceClasses?.join(','),
          page: params.page,
          per_page: params.limit
        }
      });
      return response.data;
    } catch (error) {
      logger.error({ error, params }, 'EUIPO search failed');
      throw new TrademarkError(
        TrademarkErrorCode.API_ERROR,
        'Failed to search EUIPO trademarks',
        error
      );
    }
  }
}

// Export singleton instance
export const trademarkService = new TrademarkService();