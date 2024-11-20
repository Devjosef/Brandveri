import { z } from 'zod';
import pino from 'pino';
import { TransportDestination } from '../types/loggertypes';

const transportConfigSchema = z.object({
  type: z.enum(['loki', 'file', 'console']),
  priority: z.number().min(0).max(100),
  options: z.record(z.unknown())
});

export class TransportChain {
  private transports: Map<string, pino.TransportTargetOptions>;
  private fallbacks: Map<string, string>;

  constructor() {
    this.transports = new Map();
    this.fallbacks = new Map();
  }

  addTransport(id: string, config: TransportDestination): void {
    const validated = transportConfigSchema.parse(config);
    
    switch (validated.type) {
      case 'loki':
        this.transports.set(id, {
          target: '@grafana/pino-loki',
          options: {
            ...config.options,
            batching: true,
            interval: 5,
            timeout: 5000
          },
          level: 'info'
        });
        break;
      case 'file':
        this.transports.set(id, {
          target: 'pino/file',
          options: {
            ...config.options,
            destination: config.options.path || './logs/app.log',
            mkdir: true
          },
          level: 'debug'
        });
        break;
    }
  }

  setFallback(primaryId: string, fallbackId: string): void {
    if (!this.transports.has(primaryId) || !this.transports.has(fallbackId)) {
      throw new Error('Transport not found');
    }
    this.fallbacks.set(primaryId, fallbackId);
  }

  getTransportConfig(): pino.TransportMultiOptions {
    return {
      targets: Array.from(this.transports.values()),
      levels: {
        loki: 30,
        file: 20
      },
      dedupe: true
    };
  }
}