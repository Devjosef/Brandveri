import supertest from 'supertest';
import server from '../../src/server';
import { mocks } from '../__mocks__';
import crypto from 'crypto';

const { logger: loggerMock } = mocks;

const request = supertest(server.app); // Accessing  the Express app from server

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Custom API test error with request details
 */
class ApiTestError extends Error {
  constructor(
    public readonly method: HttpMethod,
    public readonly path: string,
    public readonly details: string,
    public readonly data?: unknown
  ) {
    super(`API Test Error: ${method} ${path} - ${details}`);
    this.name = 'ApiTestError';
  }
}

/**
 * Test API client for making HTTP requests in tests.
 * Handles common patterns like auth, logging, and error handling.
 */
export class TestApi {
  public static readonly DEFAULT_TIMEOUTS = {
    default: 5000,
    upload: 10000,
    download: 15000
  } as const;

  private readonly timeouts: typeof TestApi.DEFAULT_TIMEOUTS;

  constructor(customTimeouts?: Partial<typeof TestApi.DEFAULT_TIMEOUTS>) {
    this.timeouts = { ...TestApi.DEFAULT_TIMEOUTS, ...customTimeouts };
  }

  private readonly defaultTimeout = 5000;

  /**
   * Make a GET request
   */
  async get(path: string, token?: string, query?: Record<string, string>) {
    this.validatePath(path);
    return this.request('GET', path, undefined, token, query);
  }

  /**
   * Make a POST request
   */
  async post(path: string, data?: unknown, token?: string) {
    return this.request('POST', path, data, token);
  }

  /**
   * Make a PUT request
   */
  async put(path: string, data?: unknown, token?: string) {
    return this.request('PUT', path, data, token);
  }

  /**
   * Make a DELETE request
   */
  async delete(path: string, token?: string) {
    return this.request('DELETE', path, undefined, token);
  }

  /**
   * Base request method with error handling and logging
   */
  private async request(
    method: HttpMethod,
    path: string,
    data?: unknown,
    token?: string,
    query?: Record<string, string>
  ) {
    try {
      const isValidMethod = (method: string): method is Lowercase<HttpMethod> => 
        ['get', 'post', 'put', 'delete'].includes(method);

      type LowercaseHttpMethod = Lowercase<HttpMethod>;
      const requestMethod = method.toLowerCase() as LowercaseHttpMethod;
      if (!isValidMethod(requestMethod)) {
        throw new ApiTestError(method, path, `Invalid HTTP method: ${method}`);
      }

      let req = request[requestMethod](path);

      if (query) {
        req = req.query(query);
      }

      if (token) {
        req = req.set('Authorization', `Bearer ${token}`);
      }

      if (data) {
        req = req
          .send(data)
          .set('Content-Type', 'application/json');
      }

      req = req.timeout(
        path.includes('/upload') ? this.timeouts.upload : 
        path.includes('/download') ? this.timeouts.download : 
        this.timeouts.default
      );

      const startTime = Date.now();
      const response = await req;
      const duration = Date.now() - startTime;
      
      loggerMock.debug('API request completed', {
        method,
        path,
        status: response.status,
        duration,
        query: query || undefined,
        hasToken: !!token,
        hasData: !!data,
        timestamp: new Date().toISOString()
      });

      return response;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'timeout' in error) {
        throw new ApiTestError(
          method,
          path,
          `Request timed out after ${this.defaultTimeout}ms`
        );
      }

      throw new ApiTestError(
        method,
        path,
        error instanceof Error ? error.message : String(error),
        data
      );
    }
  }

  /**
   * Create a test auth token
   */
  createTestToken(
    userId: string, 
    roles: string[] = ['user'],
    expiresIn: number = 3600
  ): string {
    const now = Date.now();
    return Buffer.from(JSON.stringify({
      sub: userId,
      roles,
      iat: Math.floor(now / 1000),
      exp: Math.floor(now / 1000) + expiresIn,
      jti: crypto.randomUUID()
    })).toString('base64');
  }

  private validatePath(path: string): void {
    if (!path.startsWith('/')) {
      throw new ApiTestError('GET', path, 'Path must start with /');
    }
  }
}

// Single instance for all tests
export const testApi = new TestApi();