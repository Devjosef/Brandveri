# Cache Metrics Documentation

## Overview
Our Redis cache implementation includes comprehensive metrics collection using Prometheus client, tracking performance, errors, and system health.

## Core Metrics

### 1. Operation Metrics
Tracks basic cache operations:
- GET operations (`brandveri_cache_operations_total{operation="get"}`)
- SET operations (`brandveri_cache_operations_total{operation="set"}`)
- DELETE operations (`brandveri_cache_operations_total{operation="del"}`)
- PING (health checks) (`brandveri_cache_operations_total{operation="ping"}`)

Reference: `metrics.ts`, startLine: 25, endLine: 30

### 2. Performance Metrics
Tracks latency and duration for cache operations (`brandveri_cache_operation_duration_seconds`):
- Operation duration buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1] seconds
- Service-labeled measurements
- Per-operation latency tracking

Reference: `metrics.ts`, startLine: 32, endLine: 38

### 3. Error Tracking
Monitors cache failures and issues (`brandveri_cache_errors_total`):
- Operation errors by type (`error_type`)
- Circuit breaker events (`operation="ping"`)
- Connection failures (`error_type="connection_failed"`)
- Error counts by operation (`operation={get|set|del|ping}`)

Reference: `metrics.ts`, startLine: 40, endLine: 45

### 4. Connection Metrics
Tracks Redis connection status (`brandveri_cache_connections`):
- Active connections (gauge metric)
- Connection pool status (labeled by service)
- Connection events (delta updates: +1/-1)

Reference: `metrics.ts`, startLine: 47, endLine: 52

### 5. Memory Metrics
Monitors Redis memory usage (`brandveri_cache_memory_bytes`):
- Memory utilization by type
- Peak memory tracking
- Memory fragmentation monitoring
- Database-specific keyspace metrics (`brandveri_cache_keyspace_size`)

Reference: `metrics.ts`, startLine: 55, endLine: 69

### 6. System Metrics
Advanced system-level monitoring:
- Cache hit ratios
- Replication lag
- Default Node.js metrics
- GC duration metrics

Reference: `metrics.ts`, startLine: 71, endLine: 84

### 7. Default Node.js Metrics
Automatically collected metrics with prefix 'brandveri_cache_':
- GC metrics (duration buckets: [0.001, 0.01, 0.1, 1, 2, 5])
- Memory heap statistics
- Event loop lag
- Active handles/requests

Reference: `metrics.ts`, startLine: 14, endLine: 19

## Health Check Integration
Provides detailed health status of the cache service:
- Cache availability status
- Operation latency measurements
- Memory usage statistics
- Cluster health information

### Response Format

```typescript
{
"status": "healthy" | "unhealthy" | "error",
"timestamp": "ISO-8601",
"details": {
"cache": boolean,
"latency": number,
"memory": {
"used": number,
"peak": number,
"fragmentationRatio": number
},
"cluster": {
"nodesStatus": [
{
"host": string,
"status": "connected" | "disconnected",
"role": "master" | "slave",
"replicationLag": number
}
],
"totalNodes": number,
"healthyNodes": number
}
}
}  
```


### Health Check Components
- Cache availability check (`healthCheck.ts`, startLine: 141, endLine: 153)
- Memory usage monitoring (`healthCheck.ts`, startLine: 68, endLine: 75)
- Cluster node status (`healthCheck.ts`, startLine: 32, endLine: 66)
- Replication lag tracking (`healthCheck.ts`, startLine: 41, endLine: 43)


## Best Practices

### 1. Error Rate Monitoring
Monitor these key metrics:
- Circuit breaker open events
- Failed operations ratio
- Connection drops

### 2. Performance Monitoring
Watch for:
- Operation latency spikes
- Memory usage trends
- Connection pool utilization

### 3. Cluster Health
For clustered deployments:
- Node availability
- Replication lag
- Master/Slave status

## Alert Thresholds

### Critical Alerts
- Error rate > 50% (Circuit breaker threshold)
- Latency > 3000ms (Timeout threshold)
- Memory usage > 90%
- Cluster health < 50%

Reference: `redis.ts`, startLine: 74, endLine: 81

### Warning Alerts
- Error rate > 25%
- Latency > 1000ms
- Memory usage > 75%
- Replication lag > 1000 bytes

## Dashboard Integration
All metrics are Prometheus-compatible and can be visualized using Grafana or similar tools.

