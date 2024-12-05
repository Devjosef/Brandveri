import { Counter } from 'prom-client';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.system;

/**
 * Single metric to.
 * - Only track critical lock states,
 * - And minimize overhead.
 */
const lockMetrics = new Counter({
    name: 'system_lock_state',
    help: 'Lock state changes',
    labelNames: ['state']
});

/**
 * A simplified lock to handle.
 * - Direct state management,
 * - Clear ownership,
 * - Minimal overhead.
 */
export class AsyncLock {
    private readonly locks = new Map<string, boolean>();
    private readonly pending = new Map<string, Array<() => void>>();

    async acquire(key: string, timeoutMs = 30000): Promise<void> {
        if (!this.locks.has(key)) {
            this.locks.set(key, true);
            lockMetrics.inc({ state: 'acquired' });
            logger.debug({ key }, 'Lock acquired');
            return;
        }

        return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.removePending(key, resolve);
                logger.warn({ key, timeoutMs }, 'Lock acquisition timeout');
                reject(new Error(`Lock timeout: ${key}`));
            }, timeoutMs);

            this.addPending(key, () => {
                clearTimeout(timer);
                resolve();
            });
        });
    }

    release(key: string): void {
        const next = this.pending.get(key)?.shift();
        if (next) {
            next();
            lockMetrics.inc({ state: 'transferred' });
            logger.debug({ key }, 'Lock transferred');
        } else {
            this.locks.delete(key);
            this.pending.delete(key);
            lockMetrics.inc({ state: 'released' });
            logger.debug({ key }, 'Lock released');
        }
    }

    private addPending(key: string, resolver: () => void): void {
        const waiters = this.pending.get(key) ?? [];
        waiters.push(resolver);
        this.pending.set(key, waiters);
        lockMetrics.inc({ state: 'pending' });
        logger.debug({ key, waitersCount: waiters.length }, 'Added to pending queue');
    }

    private removePending(key: string, resolver: () => void): void {
        const waiters = this.pending.get(key);
        if (waiters) {
            const index = waiters.indexOf(resolver);
            if (index !== -1) {
                waiters.splice(index, 1);
                if (waiters.length === 0) {
                    this.pending.delete(key);
                }
            }
        }
    }
}