import { Request, Response, NextFunction } from 'express';
import { AuthError } from '../auth/utils/AuthError';
import { ZodError } from 'zod';
import { Counter } from 'prom-client';

// Metrics for error tracking
const errorCounter = new Counter({
  name: 'error_total',
  help: 'Total number of errors by type',
  labelNames: ['error_type', 'status_code']
});

// Error types for better categorization
type ErrorWithStatus = Error & { statusCode?: number };
type ErrorWithCode = Error & { code?: string };

export const errorHandler = (
  error: ErrorWithStatus & ErrorWithCode,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Increment error counter with appropriate labels
  errorCounter.inc({
    error_type: error.constructor.name,
    status_code: error.statusCode || 500
  });

  const errorResponse = {
    status: 'error',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    requestId: req.id
  };

  // Handle specific error types
  if (error instanceof AuthError) {
    return res.status(error.statusCode).json({
      ...errorResponse,
      code: error.code,
      message: error.message
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      ...errorResponse,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: error.errors
    });
  }

  // Handle known operational errors
  if (error.statusCode && error.statusCode < 500) {
    return res.status(error.statusCode).json({
      ...errorResponse,
      code: error.code || 'CLIENT_ERROR',
      message: error.message
    });
  }

  // Production vs Development error handling
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      ...errorResponse,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error'
    });
  } else {
    return res.status(500).json({
      ...errorResponse,
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      stack: error.stack
    });
  }
};