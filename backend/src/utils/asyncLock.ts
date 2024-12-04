import { Counter, Histogram } from 'prom-client';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.recommendation;

const lockMetrics = {
    acquisitionDuration: new Histogram({
        name: 'lock_acquisition_duration_seconds',
        help: 'Duration of lock acquisition attempts',
        labelNames: ['key', 'status'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1]
    }),
    operations: new Counter({
        name: 'lock_operations_total',
        help: 'Total number of lock operations',
        labelNames: ['operation', 'key', 'status']
    })
};

export class AsyncLock {
    private locks = new Map<string, boolean>();
    private waitQueue = new Map<string, Array<{
        resolve: () => void;
        reject: (error: Error) => void;
        timer: NodeJS.Timeout;
        startTime: number;
    }>>();

    async acquire(key: string, timeoutMs = 30000): Promise<void> {
        const startTime = Date.now();
        logger.debug({ key, timeoutMs }, 'Attempting to acquire lock');
        
        if (!this.locks.get(key)) {
            this.locks.set(key, true);
            lockMetrics.operations.inc({ operation: 'acquire', key, status: 'immediate' });
            lockMetrics.acquisitionDuration.observe({ key, status: 'immediate' }, 0);
            logger.debug({ key }, 'Lock acquired immediately');
            return;
        }

        logger.debug({ key }, 'Lock busy, adding to queue');
        return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.removeFromQueue(key, resolve);
                lockMetrics.operations.inc({ operation: 'acquire', key, status: 'timeout' });
                logger.warn({ key, timeoutMs }, 'Lock acquisition timed out');
                reject(new Error(`Lock acquisition timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            this.addToQueue(key, resolve, reject, timer, startTime);
        });
    }

    release(key: string): void {
        const waitQueue = this.waitQueue.get(key) || [];
        logger.debug({ key, queueLength: waitQueue.length }, 'Releasing lock');
        
        if (waitQueue.length > 0) {
            const next = waitQueue.shift()!;
            clearTimeout(next.timer);
            const duration = (Date.now() - next.startTime) / 1000;
            lockMetrics.acquisitionDuration.observe({ key, status: 'queued' }, duration);
            logger.debug({ key, duration }, 'Lock transferred to next in queue');
            next.resolve();
        } else {
            this.locks.set(key, false);
            logger.debug({ key }, 'Lock released with empty queue');
        }

        lockMetrics.operations.inc({ operation: 'release', key, status: 'success' });
    }

    private addToQueue(
        key: string, 
        resolve: () => void, 
        reject: (error: Error) => void,
        timer: NodeJS.Timeout,
        startTime: number
    ): void {
        if (!this.waitQueue.has(key)) {
            this.waitQueue.set(key, []);
        }
        this.waitQueue.get(key)!.push({ resolve, reject, timer, startTime });
        lockMetrics.operations.inc({ operation: 'queue', key, status: 'added' });
        logger.debug({ key }, 'Added request to queue');
    }

    private removeFromQueue(key: string, resolve: () => void): void {
        const queue = this.waitQueue.get(key);
        if (queue) {
            const index = queue.findIndex(item => item.resolve === resolve);
            if (index !== -1) {
                queue.splice(index, 1);
                lockMetrics.operations.inc({ operation: 'queue', key, status: 'removed' });
                logger.debug({ key }, 'Removed request from queue');
            }
        }
    }
}