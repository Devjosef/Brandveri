import { Trademark, TrademarkResponse } from '../../../types/trademark';
import { Counter, Histogram } from 'prom-client';
import crypto from 'crypto';

const formatMetrics = {
  duration: new Histogram({
    name: 'trademark_format_duration_seconds',
    help: 'Duration of trademark formatting operations',
    buckets: [0.01, 0.05, 0.1, 0.5]
  }),
  operations: new Counter({
    name: 'trademark_format_operations_total',
    help: 'Total number of trademark format operations',
    labelNames: ['status']
  })
};

export function formatTrademarkResponse(
  data: Readonly<Trademark>, 
  correlationId?: string
): TrademarkResponse {
  const timer = formatMetrics.duration.startTimer();
  const API_VERSION = '1.0.0';
  
  try {
    const formatted: TrademarkResponse = {
      success: true,
      version: API_VERSION,
      data: Object.freeze({...data}),
      metadata: Object.freeze({
        requestId: crypto.randomUUID(),
        timestamp: new Date(),
        path: '/api/trademark',
        correlationId
      })
    };

    formatMetrics.operations.inc({ status: 'success' });
    return Object.freeze(formatted);
  } catch (error) {
    formatMetrics.operations.inc({ status: 'error' });
    throw error;
  } finally {
    timer();
  }
}