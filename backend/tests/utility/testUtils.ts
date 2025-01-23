import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const testUtils = {
  // Creates a basic request mock.
  mockRequest(overrides = {}): Request {
    return {
      body: {},
      query: {},
      headers: {},
      ...overrides
    } as Request;
  },

  // Creates a basic response mock
  mockResponse(): Response {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    } as unknown as Response;
  },

  // Creates a test for JWT
  createToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'test');
  },

  // Basic assertions
  assertSuccess(res: any) {
    expect(res.status).toHaveBeenCalledWith(200);
  },

  assertError(res: any, status = 400) {
    expect(res.status).toHaveBeenCalledWith(status);
  }
};
