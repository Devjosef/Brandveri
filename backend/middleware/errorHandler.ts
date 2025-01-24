import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';

// Define custom error interface
interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

// Type predicate to check, if the error is an AppError
function isAppError(error: unknown): error is AppError {
  return error instanceof Error && 'statusCode' in error;
}

// Error handler
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (isAppError(error)) {
    // Handles known application errors.
    res.status(error.statusCode || 500).json({
      status: 'error',
      code: error.code,
      message: error.message,
      details: error.details
    });
  } else {
    // Handles unknown errors.
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};