import { DeepPartial } from 'typeorm';
import { Request, Response } from 'express';

/**
 * Mock utility functions for testing HTTP requests and responses
 */

export const createMockRequest = (overrides: DeepPartial<Request> = {}): Request => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  ...overrides
} as Request);

export const createMockResponse = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    locals: {},
    setHeader: jest.fn().mockReturnThis()
  };
  return res as Response;
};