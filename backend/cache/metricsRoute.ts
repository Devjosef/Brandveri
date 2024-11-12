import express, { Request, Response } from 'express';
import { createMetricsCollector, OperationType } from './metrics';

interface MetricsErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  details?: {
    operation?: OperationType;
    latency?: number;
  };
}

const router = express.Router();
const metricsCollector = createMetricsCollector();

/**
 * Metrics endpoint for Prometheus scraping
 * @route GET /metrics
 * @returns {string} Prometheus formatted metrics
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const registry = metricsCollector.getMetricsRegistry();
    const metrics = await registry.metrics();
    const latency = Date.now() - startTime;
    
    // Record the metrics collection latency
    metricsCollector.observeLatency('metrics_collection', latency);
    metricsCollector.recordOperation('metrics_collection', 'success');

    res.set('Content-Type', registry.contentType);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.end(metrics);
  } catch (error) {
    metricsCollector.recordOperation('metrics_collection', 'error');

    const errorResponse: MetricsErrorResponse = {
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      details: {
        operation: 'metrics_collection',
        latency: Date.now() - startTime
      }
    };

    res.status(500).json(errorResponse);
  }
});

export default router;