import { z } from 'zod';
import { TrademarkErrorCode } from '../../../types/trademark';
import { Counter } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';

const logger = loggers.trademark;


// Metrics for tracking trademark related errors.
const errorMetrics = new Counter({
  name: 'trademark_errors_total',
  help: 'Total number of trademark errors by type',
  labelNames: ['error_type', 'code', 'severity']
});

/**
 * An example of a custom error class for handling trademark-related errors.
 * @class TrademarkError
 * @extends Error
 * 
 * @example
 * ```typescript
 * throw new TrademarkError(
 *   TrademarkErrorCode.VALIDATION_ERROR,
 *   'Invalid trademark data',
 *   { field: 'name', value: '' }
 * );
 * ```
 */
export class TrademarkError extends Error {
  /**
   * Creates a new TrademarkError instance
   * @param code - Error code from the types of TrademarkErrorCode enum.
   * @param message - A Human-readable error message.
   * @param details - Additional error context is optional, can be added.
   */
  constructor(
    public readonly code: TrademarkErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'TrademarkError';
    
    // Preserve the stack trace.
    Error.captureStackTrace(this, this.constructor);

    // Log and track errors.
    logger.error({
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack
    }, 'Trademark error occurred');

    errorMetrics.inc({
      error_type: this.name,
      code: this.code,
      severity: this.getSeverity()
    });
  }

  /**
   * Determines the error severity, based on error code.
   * @private
   * @returns {string} Error severity levels.
   */
  private getSeverity(): string {
    const criticalErrors = [
      TrademarkErrorCode.API_ERROR,
      TrademarkErrorCode.CACHE_ERROR
    ];
    
    return criticalErrors.includes(this.code) ? 'critical' : 'normal';
  }

  /**
   * Creates a TrademarkError using the Zod validation error.
   * @param error - Zod validation error.
   * @returns {TrademarkError} A formatted trademark error.
   */
  static fromZodError(error: z.ZodError): TrademarkError {
    const details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    return new TrademarkError(
      TrademarkErrorCode.VALIDATION_ERROR,
      'Validation failed',
      details
    );
  }

  /**
   * Creates a TrademarkError from an unknown error type, to handle edge case.
   * @param error - An unknown error object.
   * @returns {TrademarkError} A formatted trademark error
   */
  static fromUnknown(error: unknown): TrademarkError {
    if (error instanceof TrademarkError) {
      return error;
    }
    
    const message = error instanceof Error ? 
      error.message : 
      'An unknown error occurred';

    const details = error instanceof Error ? {
      name: error.name,
      stack: error.stack
    } : undefined;
    
    return new TrademarkError(
      TrademarkErrorCode.UNKNOWN_ERROR,
      message,
      details
    );
  }

  /**
   * Converts error into a JSON-serializable object. Simplifies debugging.
   * @returns {object} A serialized error.
   */
  toJSON(): object {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack
    };
  }
}