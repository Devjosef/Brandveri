import { z } from 'zod';
import { TrademarkErrorCode } from '../../../types/trademark';
import { Counter } from 'prom-client';

const errorMetrics = new Counter({
  name: 'trademark_errors_total',
  help: 'Total number of trademark errors by type',
  labelNames: ['error_type', 'code']
});

export class TrademarkError extends Error {
  constructor(
    public readonly code: TrademarkErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'TrademarkError';
    
    errorMetrics.inc({
      error_type: this.name,
      code: this.code
    });
  }

  static fromZodError(error: z.ZodError): TrademarkError {
    return new TrademarkError(
      TrademarkErrorCode.VALIDATION_ERROR,
      'Validation failed',
      error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    );
  }

  static fromUnknown(error: unknown): TrademarkError {
    if (error instanceof TrademarkError) {
      return error;
    }
    
    return new TrademarkError(
      TrademarkErrorCode.UNKNOWN_ERROR,
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
  }
}