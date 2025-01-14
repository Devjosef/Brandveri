# Service Metrics Documentation

## Overview
This document outlines the metrics collection, monitoring, and alerting strategies for the core services.

## Core Service Metrics

### 1. Copyright Service Metrics
- **Operation Metrics**
  ```prometheus
  # Copyright Check Rate
  rate(copyright_checks_total[5m])
  
  # License Validation Success Rate
  sum(rate(license_validations_total{status="success"}[5m]))
  / sum(rate(license_validations_total[5m]))
  ```

- **Performance Metrics**
  - Scan duration
  - Repository processing time
  - License detection accuracy
  - API response time

### 2. Recommendation Service Metrics
- **AI Performance**
  ```prometheus
  # AI Response Time
  histogram_quantile(0.95, sum(rate(ai_response_duration_seconds_bucket[5m])))
  
  # Recommendation Quality Score
  avg(recommendation_quality_score) by (type)
  ```

- **Cache Performance**
  ```prometheus
  # Cache Hit Rate
  sum(rate(cache_hits_total[5m]))
  / sum(rate(cache_operations_total[5m]))
  
  # Cache Latency
  histogram_quantile(0.95, sum(rate(cache_operation_duration_seconds_bucket[5m])))
  ```

### 3. Trademark Service Metrics
- **Search Performance**
  ```prometheus
  # Search Latency by Registry
  histogram_quantile(0.95, sum(rate(trademark_search_duration_seconds_bucket[5m])) by (registry))
  
  # Search Success Rate
  sum(rate(trademark_searches_total{status="success"}[5m])) by (registry)
  / sum(rate(trademark_searches_total[5m])) by (registry)
  ```

### 4. Payment Service Metrics
- **Transaction Metrics**
  ```prometheus
  # Payment Success Rate
  sum(rate(payment_transactions_total{status="success"}[5m]))
  / sum(rate(payment_transactions_total[5m]))
  
  # Transaction Value
  sum(payment_amount_total) by (currency)
  ```

## System Metrics

### 1. Resource Usage
```prometheus
# CPU Usage
rate(process_cpu_seconds_total[5m])

# Memory Usage
process_resident_memory_bytes

# Garbage Collection
rate(nodejs_gc_duration_seconds_count[5m])
```

### 2. Network Metrics
```prometheus
# Request Rate
rate(http_requests_total[5m])

# Error Rate
rate(http_requests_total{status=~"5.."}[5m])

# Latency Distribution
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (route))
```

## Performance Metrics

### 1. Service Performance
- **Response Time**
  ```prometheus
  # Service Latency
  histogram_quantile(0.99, sum(rate(service_latency_bucket[5m])) by (service))
  
  # Operation Duration
  histogram_quantile(0.95, sum(rate(operation_duration_seconds_bucket[5m])) by (operation))
  ```

### 2. Dependency Health
```prometheus
# Database Connection Pool
sum(db_connections_active) by (pool)

# Redis Operations
rate(redis_commands_total[5m])

# External API Latency
histogram_quantile(0.95, sum(rate(external_api_duration_seconds_bucket[5m])) by (api))
```

## Alert Thresholds

### 1. Critical Alerts
```yaml
# High Error Rate Alert
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: High error rate detected
    
# Service Latency Alert
- alert: HighLatency
  expr: histogram_quantile(0.95, sum(rate(service_latency_bucket[5m]))) > 2
  for: 5m
  labels:
    severity: critical
```

### 2. Warning Alerts
```yaml
# Resource Usage Alert
- alert: HighCPUUsage
  expr: rate(process_cpu_seconds_total[5m]) > 0.8
  for: 10m
  labels:
    severity: warning

# Cache Performance Alert
- alert: LowCacheHitRate
  expr: sum(rate(cache_hits_total[5m])) / sum(rate(cache_operations_total[5m])) < 0.5
  for: 15m
  labels:
    severity: warning
```

## Dashboards

### 1. Service Overview
- Request rate and errors
- Response time distribution
- Resource usage
- Cache performance
- Database metrics

### 2. Business Metrics
- Transaction success rate
- Revenue metrics
- User activity
- Feature usage
- Error distribution

## Reporting

### 1. SLA Metrics
- Service availability
- Error budget consumption
- Performance compliance
- Recovery time objectives

### 2. Business Reports
- Daily transaction summary
- Weekly performance review
- Monthly service health
- Quarterly trend analysis
