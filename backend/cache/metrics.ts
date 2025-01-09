import client from 'prom-client';

export type OperationType = 'get' | 'set' | 'del' | 'ping' | 'clear' | 'reset';
export type OperationStatus = 'success' | 'error';

export interface MetricsCollector {
  observeLatency: (operation: OperationType, duration: number) => void;
  recordOperation: (operation: OperationType, status: OperationStatus) => void;
  getMetricsRegistry: () => client.Registry;
  clearMetrics: () => void;
  updateConnections: (delta: 1 | -1) => void;
}

// Configure default metrics with a custom prefix
client.collectDefaultMetrics({
  prefix: 'brandveri_cache_',
  labels: { service: 'cache' },
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

const register = new client.Registry();

// Create custom metrics with more detailed configuration
const metrics = {
  cacheOperations: new client.Counter({
    name: 'brandveri_cache_operations_total',
    help: 'Total number of cache operations',
    labelNames: ['operation', 'status', 'service'],
    registers: [register]
  }),

  cacheLatency: new client.Histogram({
    name: 'brandveri_cache_operation_duration_seconds',
    help: 'Cache operation latency in seconds',
    labelNames: ['operation', 'service'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register]
  }),

  cacheErrors: new client.Counter({
    name: 'brandveri_cache_errors_total',
    help: 'Total number of cache operation errors',
    labelNames: ['operation', 'error_type', 'service'],
    registers: [register]
  }),

  cacheConnections: new client.Gauge({
    name: 'brandveri_cache_connections',
    help: 'Number of active cache connections',
    labelNames: ['service'],
    registers: [register]
  })
};

const enhancedMetrics = {
  ...metrics,
  cacheMemoryUsage: new client.Gauge({
    name: 'brandveri_cache_memory_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type'],
    registers: [register]
  }),
  cacheKeyspace: new client.Gauge({
    name: 'brandveri_cache_keyspace_size',
    help: 'Number of keys in cache',
    labelNames: ['db'],
    registers: [register]
  })
};

const systemMetrics = {
  ...enhancedMetrics,
  cacheHitRatio: new client.Gauge({
    name: 'brandveri_cache_hit_ratio',
    help: 'Cache hit ratio',
    labelNames: ['operation'],
    registers: [register]
  }),
  cacheLag: new client.Gauge({
    name: 'brandveri_cache_replication_lag_seconds',
    help: 'Replication lag in seconds',
    registers: [register]
  })
};

/**
 * Creates a metrics collector instance for monitoring cache operations
 * @returns {MetricsCollector} Metrics collector instance
 */
export function createMetricsCollector(): MetricsCollector {
  return {
    observeLatency: (operation: OperationType, duration: number) => {
      systemMetrics.cacheLatency
        .labels({ operation, service: 'cache' })
        .observe(duration / 1000);
    },

    recordOperation: (operation: OperationType, status: OperationStatus) => {
      systemMetrics.cacheOperations
        .labels({ operation, status, service: 'cache' })
        .inc();

      if (status === 'error') {
        systemMetrics.cacheErrors
          .labels({ operation, error_type: 'operation_failed', service: 'cache' })
          .inc();
      }
    },

    getMetricsRegistry: () => register,

    clearMetrics: () => {
      register.clear();
    },

    updateConnections: (delta: 1 | -1) => {
      systemMetrics.cacheConnections
        .labels({ service: 'cache' })
        .inc(delta);
    }
  };
}

// Export enhanced metrics instance for direct access
export const metricsInstance = systemMetrics;