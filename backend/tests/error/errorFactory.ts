import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

// Simple and explicit error types.
type TestErrorType = 
  | 'API_ERROR'      // External API errors,
  | 'DB_ERROR'       // Database errors,
  | 'AUTH_ERROR'     // Authentication errors,
  | 'TEST_ERROR';    // General test errors.

interface TestError extends Error {
  type: TestErrorType;
  details?: unknown;
}

// Simple error factory
export const createError = (
  message: string, 
  type: TestErrorType, 
  details?: unknown
): TestError => {
  const error = new Error(message) as TestError;
  error.type = type;
  error.details = details;

  // Log and return
  logger.error({ message, type, details }, 'Test error');
  return error;
};

// Common errors 
export const testError = {
  api: (message: string, details?: unknown) => 
    createError(message, 'API_ERROR', details),
    
  db: (message: string, details?: unknown) => 
    createError(message, 'DB_ERROR', details),
    
  auth: (message: string, details?: unknown) => 
    createError(message, 'AUTH_ERROR', details),
    
  test: (message: string, details?: unknown) => 
    createError(message, 'TEST_ERROR', details)
};