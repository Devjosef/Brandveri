import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

export type ErrorCode = 
  | 'USPTO_ERROR'
  | 'EUIPO_ERROR'
  | 'PAYMENT_ERROR'
  | 'FIXTURE_ERROR'
  | 'MOCK_ERROR';

export interface TestError extends Error {
  code: ErrorCode;
  details?: unknown;
  timestamp: string;
}

/**
 * Create test errors with consistent structure
 */
export function createTestError(
  message: string,
  code: ErrorCode,
  details?: unknown
): TestError {
  const error = new Error(message) as TestError;
  error.code = code;
  error.details = details;
  error.timestamp = new Date().toISOString();
  
  logger.error({ 
    error: message,
    code,
    details,
    timestamp: error.timestamp 
  }, 'Test error occurred');

  return error;
}

/**
 * Common test errors
 */
export const testErrors = {
  uspto: (details?: unknown) => 
    createTestError('USPTO API error', 'USPTO_ERROR', details),
    
  euipo: (details?: unknown) => 
    createTestError('EUIPO API error', 'EUIPO_ERROR', details),
    
  payment: (details?: unknown) => 
    createTestError('Payment processing error', 'PAYMENT_ERROR', details),
    
  fixture: (details?: unknown) => 
    createTestError('Fixture loading error', 'FIXTURE_ERROR', details),
    
  mock: (details?: unknown) => 
    createTestError('Mock loading error', 'MOCK_ERROR', details)
};
