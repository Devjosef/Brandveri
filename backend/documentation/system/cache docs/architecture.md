# Redis Cache Architecture

## Overview
The caching system is built with high availability, monitoring, and fault tolerance in mind. It supports both standalone Redis and cluster configurations with comprehensive error handling and metrics collection.

## Core Components

### 1. Redis Client (redis.ts)
- **Protected Redis Client**: Implements circuit breaker pattern to prevent cascading failures
- **Reconnection Strategy**: Exponential backoff with configurable retries
- **Health Monitoring**: Integrated with Prometheus metrics
- **Graceful Shutdown**: Proper connection cleanup

Reference: `redis.ts`, startLine: 1, endLine: 135

### 2. Cache Wrapper (cacheWrapper.ts)
Provides a high-level interface for cache operations with:
- Automatic retry mechanism
- Error handling and validation
- Performance metrics collection
- Support for both standalone and cluster operations

Reference: `cacheWrapper.ts`, startLine: 29, endLine: 164

### 3. Session Management (session.ts)
- Redis-backed session storage
- Automatic session cleanup
- Secure cookie configuration
- Production-ready settings

Reference: `session.ts`, startLine: 28, endLine: 51

### 4. Health Monitoring (healthCheck.ts)
Comprehensive health checks including:
- Cache availability
- Cluster node status
- Memory usage
- Replication lag monitoring

Reference: `healthCheck.ts`, startLine: 84, endLine: 136

### 5. Metrics Collection (metrics.ts)
Prometheus-based metrics including:
- Operation latency
- Error rates
- Connection status
- Memory usage
- Cache hit ratios

Reference: `metrics.ts`, startLine: 90, endLine: 122

## Error Handling Strategy

1. **Circuit Breaker**
   - Prevents cascading failures
   - Configurable thresholds
   - Automatic recovery

2. **Retry Mechanism**
   - Exponential backoff
   - Configurable retry limits
   - Operation-specific retry policies

3. **Custom Error Types**
   - Structured error reporting
   - Detailed error context
   - Metric integration

## Configuration

### Redis Client Configuration

```typescript
const DEFAULT_CONFIG = {
host: process.env.REDIS_HOST || '127.0.0.1',
port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
maxRetriesPerRequest: 3,
enableReadyCheck: true,
keepAlive: 5000,
connectTimeout: 10000
};```


### Circuit Breaker Settings

```typescript
const CIRCUIT_BREAKER_CONFIG = {
timeout: 3000,
errorThresholdPercentage: 50,
resetTimeout: 10000
};```


## Usage Examples

### Basic Cache Operations

```typescript
// Get value
const value = await cacheWrapper.get('key');
// Set value with TTL
await cacheWrapper.set('key', value, { ttl: 3600 });
// Delete value
await cacheWrapper.del('key');```


### Health Check Integration

```typescript
// Monitor cache health
const health = await cacheWrapper.healthCheck();
if (!health) {
logger.error('Cache system unhealthy');
}```


## Best Practices

1. **Key Management**
   - Use consistent naming conventions
   - Implement key prefixing
   - Consider TTL for all cached items

2. **Error Handling**
   - Always catch cache errors
   - Implement fallback mechanisms
   - Monitor error rates

3. **Performance**
   - Use pipeline operations for bulk operations
   - Monitor memory usage
   - Implement proper TTL strategies

4. **Monitoring**
   - Watch error rates
   - Monitor latency patterns
   - Track memory usage
   - Set up alerts for circuit breaker events