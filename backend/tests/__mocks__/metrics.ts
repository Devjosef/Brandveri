import { MetricsServiceMock, MetricValue, MetricTags } from './types/metricsTypes';
import { loggers } from 'backend/observability/contextLoggers';

const logger = loggers.test;

export const createMetricsMock = (): MetricsServiceMock => {
    // Store metrics in-memory for verification.
    const metrics = new Map<string, MetricValue>();

    const recordMetric = (
        name: string,
        value: number,
        tags?: MetricTags
    ) => {
        metrics.set(name, {
            value,
            timestamp: Date.now(),
            tags
        });
    };

    const mock: MetricsServiceMock = {
        increment: jest.fn((name: string, value = 1, tags?: MetricTags) => {
            const current = metrics.get(name)?.value || 0;
            recordMetric(name, current + value, tags);
        }),

        decrement: jest.fn((name: string, value = 1, tags?: MetricTags) => {
            const current = metrics.get(name)?.value || 0;
            recordMetric(name, current - value, tags);
        }),

        gauge: jest.fn((name: string, value: number, tags?: MetricTags) => {
            recordMetric(name, value, tags);
        }),

        timing: jest.fn((name: string, value: number, tags?: MetricTags) => {
            recordMetric(name, value, tags);
        }),

        histogram: jest.fn((name: string, value: number, tags?: MetricTags) => {
            recordMetric(name, value, tags);
        }),

        clear: jest.fn(() => {
            metrics.clear();
        }),

        getMetric: jest.fn((name: string) => metrics.get(name))
    };

    logger.debug('Metrics mock created');
    return mock;
};

// Default instance
export const metricsMock = createMetricsMock();