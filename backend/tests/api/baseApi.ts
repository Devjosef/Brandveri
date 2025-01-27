import supertest from 'supertest';
import { mocks } from '../__mocks__';


const { loggerMock } = mocks;
const request = supertest(app);

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Test API client for making HTTP requests in tests.
 * Handles common patterns like auth, logging, and error handling.
 */
export class TestApi {
  private readonly defaultTimeout = 5000;

  /**
   * Make a GET request
   */
  async get(path: string, token?: string, query?: Record<string, string>) {
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
      let req = request[method.toLowerCase()](path);

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

      req = req.timeout(this.defaultTimeout);

      const response = await req;
      
      loggerMock.debug({
        method,
        path,
        status: response.status,
        duration: response.duration
      }, 'API request completed');

      return response;
    } catch (error) {
      if (error.timeout) {
        throw testErrors.api({
          method,
          path,
          error: `Request timed out after ${this.defaultTimeout}ms`
        });
      }

      throw testErrors.api({
        method,
        path,
        data,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Create a test auth token
   */
  createTestToken(userId: string, roles: string[] = ['user']): string {
    return Buffer.from(JSON.stringify({
      sub: userId,
      roles,
      exp: Date.now() + 3600000
    })).toString('base64');
  }
}

// Single instance for all tests
export const testApi = new TestApi();