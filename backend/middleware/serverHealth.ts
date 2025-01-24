import { Request, Response } from 'express';
import { Counter, Gauge, Histogram } from 'prom-client';
import { loggers } from '../observability/contextLoggers';
import os from 'os';

const logger = loggers.system;

// Focused metric definitions.
const healthCheckMetrics = {
    requests: new Counter({
        name: 'system_health_check_requests_total',
        help: 'Total number of system health check requests',
        labelNames: ['status']
    }),
    status: new Gauge({
        name: 'system_health_status',
        help: 'Current system health status (1 for healthy, 0 for unhealthy)'
    }),
    responseTime: new Histogram({
        name: 'system_health_response_time_seconds',
        help: 'Health check response time in seconds',
        buckets: [0.1, 0.5, 1, 2, 5]
    }),
    systemMetrics: {
        cpuUsage: new Gauge({
            name: 'system_cpu_usage_percent',
            help: 'Current CPU usage percentage'
        }),
        memoryUsage: new Gauge({
            name: 'system_memory_usage_bytes',
            help: 'Current memory usage in bytes',
            labelNames: ['type']
        })
    }
};

// Comprehensive system checks.
interface SystemHealth {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    memory: {
        used: number;
        free: number;
        total: number;
        heapUsed: number;
        heapTotal: number;
    };
    cpu: {
        load: number[];
        cores: number;
        usage: NodeJS.CpuUsage;
    };
    process: {
        pid: number;
        uptime: number;
        memoryUsage: NodeJS.MemoryUsage;
    };
}

// Error handling and type safety.
class HealthCheckError extends Error {
    constructor(message: string, public readonly details?: unknown) {
        super(message);
        this.name = 'HealthCheckError';
    }
}

// Modular system checks.
async function getSystemMetrics(): Promise<SystemHealth> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.0.0',
        uptime: process.uptime(),
        memory: {
            used: os.totalmem() - os.freemem(),
            free: os.freemem(),
            total: os.totalmem(),
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal
        },
        cpu: {
            load: os.loadavg(),
            cores: os.cpus().length,
            usage: cpuUsage
        },
        process: {
            pid: process.pid,
            uptime: process.uptime(),
            memoryUsage: memUsage
        }
    };
}

// HTTP handler for system health checks with metrics collection, monitoring, and error handling.
export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
    const startTime = process.hrtime();
    
    try {
        const metrics = await getSystemMetrics();
        
        // Updates the Prometheus metrics.
        healthCheckMetrics.requests.inc({ status: 'success' });
        healthCheckMetrics.status.set(1);
        healthCheckMetrics.systemMetrics.cpuUsage.set(os.loadavg()[0]);
        healthCheckMetrics.systemMetrics.memoryUsage.set({ type: 'used' }, metrics.memory.used);
        healthCheckMetrics.systemMetrics.memoryUsage.set({ type: 'free' }, metrics.memory.free);

        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds + nanoseconds / 1e9;
        healthCheckMetrics.responseTime.observe(duration);

        logger.info({ metrics }, 'Health check passed');
        res.status(200).json(metrics);
    } catch (error) {
        healthCheckMetrics.requests.inc({ status: 'error' });
        healthCheckMetrics.status.set(0);

        const healthError = error instanceof HealthCheckError
            ? error
            : new HealthCheckError('Unexpected health check error', error);

        logger.error({ error: healthError }, 'Health check failed');
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: healthError.message,
            details: process.env.NODE_ENV === 'development' ? healthError.details : undefined
        });
    }
};

// Graceful shutdown handling.
process.on('SIGTERM', () => {
    healthCheckMetrics.status.set(0);
    logger.info('Health check disabled during shutdown');
});