import { Trademark, TrademarkResponse, ResponseMetadata } from '../../../types/trademark';
import { Counter, Histogram } from 'prom-client';
import { config } from '../utils/validation';
import { loggers } from '../../../observability/contextLoggers';
import { RequestContext } from '../../utils/requestContext';

const logger = loggers.trademark;

const formatMetrics = {
  duration: new Histogram({
    name: 'trademark_format_duration_seconds',
    help: 'Duration of trademark formatting operations',
    buckets: [0.01, 0.05, 0.1, 0.5]
  }),
  operations: new Counter({
    name: 'trademark_format_operations_total',
    help: 'Total number of trademark format operations',
    labelNames: ['status', 'version']
  })
};

/**
 * Formats the trademark data into a standardized API response.
 * @param data - The trademark data to format
 * @returns Immutable trademark response object
 * @throws {Error} If formatting fails
 */
export function formatTrademarkResponse(
  data: Readonly<Trademark>
): Readonly<TrademarkResponse> {
  const timer = formatMetrics.duration.startTimer();
  const requestContext = RequestContext.getCurrentContext();
  
  try {
    const metadata: ResponseMetadata = {
      requestId: requestContext?.correlationId || crypto.randomUUID(),
      timestamp: new Date(),
      path: '/api/trademark',
      correlationId: requestContext?.correlationId
    };

    const formatted: TrademarkResponse = {
      success: true,
      version: config.TRADEMARK.VERSION,
      data: Object.freeze({...data}),
      metadata: Object.freeze(metadata)
    };

    logger.debug({
      correlationId: requestContext?.correlationId,
      version: config.TRADEMARK.VERSION,
      dataSize: JSON.stringify(data).length
    }, 'Formatting trademark response');

    formatMetrics.operations.inc({ 
      status: 'success',
      version: config.TRADEMARK.VERSION 
    });

    return Object.freeze(formatted);
  } catch (error) {
    formatMetrics.operations.inc({ 
      status: 'error',
      version: config.TRADEMARK.VERSION 
    });
    
    logger.error({
      error,
      correlationId: requestContext?.correlationId
    }, 'Failed to format trademark response');
    
    throw error;
  } finally {
    timer();
  }
}