import { z } from 'zod';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.system;

/**
 * Provides runtime assertion and formal verification for system invariants
 */
export class Invariant {
  /**
   * Runtime assertion to catch programming errors and invalid states
   * @param condition - Boolean condition to assert
   * @param message - Error message if assertion fails
   */
  static assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
      logger.error({ message }, 'Invariant violation');
      throw new Error(`Invariant violation: ${message}`);
    }
  }

  /**
   * Verifies that a function maintains referential transparency
   * @param fn - Function to verify
   * @param input - Input to test
   * @returns Boolean indicating if function is pure
   */
  static verifyPure<T, R>(fn: (input: T) => R, input: T): boolean {
    const result1 = fn(input);
    const result2 = fn(input);
    return JSON.stringify(result1) === JSON.stringify(result2);
  }

  /**
   * Verifies that an async operation is idempotent
   * @param operation - Async operation to verify
   * @param input - Input to test
   */
  static async verifyIdempotent<T, R>(
    operation: (input: T) => Promise<R>,
    input: T
  ): Promise<void> {
    const result1 = await operation(input);
    const result2 = await operation(input);
    this.assert(
      JSON.stringify(result1) === JSON.stringify(result2),
      'Operation must be idempotent'
    );
  }

  /**
   * Verifies that an object is immutable
   * @param obj - Object to verify
   * @param schema - Zod schema for type validation
   */
  static verifyImmutable<T>(obj: T, schema: z.ZodType<T>): void {
    // Validate against schema
    schema.parse(obj);

    // Freeze object deeply
    const deepFreeze = (obj: any): void => {
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach(prop => {
        if (obj[prop] !== null 
            && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function')
            && !Object.isFrozen(obj[prop])) {
          deepFreeze(obj[prop]);
        }
      });
    };

    deepFreeze(obj);
    
    this.assert(
      Object.isFrozen(obj),
      'Object must be immutable'
    );
  }

  /**
   * Verifies concurrent operation safety
   * @param operation - Async operation to verify
   * @param input - Input to test
   * @param concurrency - Number of concurrent operations
   */
  static async verifyConcurrentSafety<T, R>(
    operation: (input: T) => Promise<R>,
    input: T,
    concurrency: number = 5
  ): Promise<void> {
    const operations = Array(concurrency)
      .fill(null)
      .map(() => operation(input));

    const results = await Promise.all(operations);
    const uniqueResults = new Set(results.map(r => JSON.stringify(r)));

    this.assert(
      uniqueResults.size === 1,
      'Operation must be safe under concurrency'
    );
  }

  /**
   * Verifies that an operation maintains data integrity
   * @param operation - Operation to verify
   * @param input - Input to test
   * @param validator - Validation function
   */
  static async verifyDataIntegrity<T, R>(
    operation: (input: T) => Promise<R>,
    input: T,
    validator: (result: R) => boolean
  ): Promise<void> {
    const result = await operation(input);
    this.assert(
      validator(result),
      'Operation must maintain data integrity'
    );
  }
}

// Export the original invariant function for backward compatibility
export function invariant(
  condition: boolean,
  message: string
): asserts condition {
  Invariant.assert(condition, message);
}