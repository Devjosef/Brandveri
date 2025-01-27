// Basic metric types
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export type MetricTags = Record<string, string>;

// Metric value types
export interface MetricValue {
    value: number;
    timestamp: number;
    tags?: MetricTags;
}

// Metrics service interface
export interface MetricsServiceMock {
    increment: jest.Mock<void, [string, number?, MetricTags?]>;
    decrement: jest.Mock<void, [string, number?, MetricTags?]>;
    gauge: jest.Mock<void, [string, number, MetricTags?]>;
    timing: jest.Mock<void, [string, number, MetricTags?]>;
    histogram: jest.Mock<void, [string, number, MetricTags?]>;
    clear: jest.Mock<void>;
    getMetric: jest.Mock<MetricValue | undefined, [string]>;
  }