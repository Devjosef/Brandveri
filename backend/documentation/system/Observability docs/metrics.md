# Observability Metrics Documentation

## Overview
This document outlines the key metrics and indicators specific to the observability stack, including OpenTelemetry, Jaeger, and logging systems.

## Telemetry Metrics

### 1. Trace Metrics
- **Trace Statistics**
  ```prometheus
  # Trace Duration
  histogram_quantile(0.95, sum(rate(trace_duration_seconds_bucket[5m])) by (service, operation))
  
  # Error Rate by Service
  sum(rate(spans_total{status_code="ERROR"}[5m])) by (service)
  / sum(rate(spans_total[5m])) by (service)
  ```

- **Span Metrics**
  - Span count per service
  - Span duration distribution
  - Error spans ratio
  - Span attribute cardinality

### 2. Context Propagation
- **Propagation Effectiveness**
  ```prometheus
  # Context Propagation Success Rate
  sum(rate(context_propagation_total{status="success"}[5m]))
  / sum(rate(context_propagation_total[5m]))
  
  # Missing Context Rate
  sum(rate(spans_total{parent_id=""}[5m])) by (service)
  ```

## OpenTelemetry Metrics

### 1. Collector Performance
- **Processing Metrics**
  ```prometheus
  # Collector Queue Length
  otel_collector_queue_size{pipeline="traces"}
  
  # Processing Latency
  histogram_quantile(0.95, sum(rate(otel_collector_processor_latency_bucket[5m])) by (processor))
  ```

- **Export Metrics**
  - Export success rate
  - Export batch size
  - Export latency
  - Retry attempts

### 2. Sampling Metrics
- **Sampling Statistics**
  ```prometheus
  # Sampling Rate
  sum(rate(spans_sampled_total[5m])) by (sampler)
  / sum(rate(spans_total[5m])) by (sampler)
  
  # Sampling Decisions
  sum(rate(sampling_decisions_total{decision="sampled"}[5m])) by (sampler)
  ```

## Distributed Tracing Metrics

### 1. Jaeger Performance
- **Trace Storage**
  ```prometheus
  # Storage Write Rate
  sum(rate(jaeger_spans_written_total[5m])) by (storage)
  
  # Storage Latency
  histogram_quantile(0.95, sum(rate(jaeger_storage_latency_bucket[5m])) by (operation))
  ```

- **Query Performance**
  - Query latency
  - Query success rate
  - Cache hit ratio
  - Index efficiency

### 2. Trace Quality
- **Data Quality Metrics**
  ```prometheus
  # Span Completeness
  sum(rate(spans_with_required_attributes_total[5m])) by (service)
  / sum(rate(spans_total[5m])) by (service)
  
  # Context Correlation
  sum(rate(spans_with_valid_parent[5m])) by (service)
  ```

## Log Integration Metrics

### 1. Log Processing
- **Processing Statistics**
  ```prometheus
  # Log Processing Rate
  sum(rate(log_entries_total[5m])) by (source)
  
  # Processing Errors
  sum(rate(log_processing_errors_total[5m])) by (type)
  ```

- **Correlation Success**
  - Trace-log correlation rate
  - Missing trace ID ratio
  - Invalid correlation attempts
  - Correlation latency

### 2. Storage Metrics
- **Log Storage**
  - Storage consumption
  - Compression ratio
  - Retention compliance
  - Query performance

## Alert Thresholds

### 1. Critical Alerts
- **High Priority**
  ```yaml
  alerts:
    - name: HighTracingLatency
      expr: histogram_quantile(0.95, trace_duration_seconds_bucket) > 5
      for: 5m
      severity: critical
    
    - name: CollectorBackpressure
      expr: otel_collector_queue_size > 1000
      for: 2m
      severity: critical
  ```

### 2. Warning Alerts
- **Medium Priority**
  ```yaml
  alerts:
    - name: IncreasedSamplingRate
      expr: sampling_rate > 0.3
      for: 15m
      severity: warning
    
    - name: HighContextPropagationFailure
      expr: context_propagation_failure_rate > 0.01
      for: 5m
      severity: warning
  ```

## Performance Dashboards

### 1. Trace Analytics
- **Dashboard Panels**
  - Service dependency map
  - Error distribution
  - Latency heatmap
  - Span statistics

### 2. System Performance
- **Resource Usage**
  - Collector resource usage
  - Storage performance
  - Query engine metrics
  - Cache effectiveness

## Capacity Planning

### 1. Resource Metrics
- **Storage Growth**
  - Trace storage rate
  - Log volume growth
  - Index size trends
  - Retention impact

### 2. Processing Capacity
- **System Limits**
  - Collector throughput
  - Query capacity
  - Storage IOPS
  - Network bandwidth

## Reporting

### 1. Operational Reports
- Daily trace statistics
- Weekly system performance
- Monthly capacity review
- Quarterly trend analysis

### 2. Quality Metrics
- Trace coverage
- Sampling effectiveness
- Context propagation success
- Data completeness
