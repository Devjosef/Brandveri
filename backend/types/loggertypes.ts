import { z } from 'zod';
import pino from 'pino';

export type TransportType = 'loki' | 'file' | 'console';

export interface TransportHealth {
  healthy: boolean;
  lastCheck: Date;
  errorCount: number;
  type: TransportType;
}

export interface TransportDestination {
  type: TransportType;
  priority: number;
  options: Record<string, unknown>;
}

export interface LogTransport {
  write(log: string): Promise<void>;
  healthCheck(): Promise<TransportHealth>;
  flush(): Promise<void>;
  getType(): TransportType;
  getPriority(): number;
 }

export interface TransportTargetOptions extends pino.TransportTargetOptions {
  target: string;
  options?: Record<string, any>;
  level?: pino.LevelWithSilent | string;
}

export interface TransportChainConfig {
  targets: TransportTargetOptions[];
  levels: Record<TransportType, pino.LevelWithSilent>;
  dedupe: boolean;
}

export const transportConfigSchema = z.object({
  type: z.enum(['loki', 'file', 'console']),
  priority: z.number().min(0).max(100),
  options: z.record(z.unknown())
});

export type ValidatedTransportConfig = z.infer<typeof transportConfigSchema>;