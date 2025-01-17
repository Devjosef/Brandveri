import { Express } from 'express';
import client from 'prom-client';
import { loggers } from './contextLoggers';

const logger = loggers.metrics;

// Initialize metrics registry
const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'brandveri_'
});

// Define custom metrics
export const metrics = {
  httpRequestDuration: new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  }),
  httpRequestTotal: new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  })
};

export const setupMetrics = (app: Express): void => {
  logger.info('Setting up metrics collection');

  // Metrics endpoint
  app.get('/metrics', async (_req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.send(metrics);
    } catch (error) {
      logger.error({ error }, 'Error generating metrics');
      res.status(500).send('Error generating metrics');
    }
  });

  logger.info('Metrics endpoint configured at /metrics');
};

export { register as metricsRegistry };
