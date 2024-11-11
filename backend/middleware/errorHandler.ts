import { Request, Response, NextFunction } from 'express';
import { AuthError } from '../auth/utils/AuthError';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(`[Error] ${error.message}`, {
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    error: error.stack
  });

  if (error instanceof AuthError) {
    return res.status(error.statusCode).json({
      status: 'error',
      code: error.code,
      message: error.message
    });
  }

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};