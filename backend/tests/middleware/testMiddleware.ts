import { Request, Response, NextFunction } from 'express';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

// Simple mock factories 
export const testMiddleware = {
  // Mocks request with defaults.
  req: (overrides = {}): Request => ({
    headers: {},
    body: {},
    query: {},
    params: {},
    ...overrides
  } as Request),

  // Mocks response with jest functions.
  res: (): Response => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    locals: {}
  } as unknown as Response),

  // Mocks next function.
  next: (): NextFunction => jest.fn(),

  // Executes middleware with error logging.
  async execute(
    middleware: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
    req: Request = testMiddleware.req(),
    res: Response = testMiddleware.res(),
    next: NextFunction = testMiddleware.next()
  ) {
    try {
      await middleware(req, res, next);
    } catch (error) {
      logger.error({ error }, 'Middleware error');
      throw error; 
    }
    return { req, res, next }; 
  }
};