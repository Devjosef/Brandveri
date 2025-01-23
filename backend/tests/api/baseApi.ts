import supertest from 'supertest';
import { app } from '../../app';
import { loggers } from '../../observability/contextLoggers';
import { testErrors } from '../error/errorFactory';

const logger = loggers.test;
const request = supertest(app);

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Basic API test utilities.
 */
export class TestApi {
  // Added timeout for slow endpoints.
  private defaultTimeout = 5000;

  async get(path: string, token?: string, query?: Record<string, string>) {
    return this.request('GET', path, undefined, token, query);
  }

  async post(path: string, data?: unknown, token?: string) {
    return this.request('POST', path, data, token);
  }

  async put(path: string, data?: unknown, token?: string) {
    return this.request('PUT', path, data, token);
  }

  async delete(path: string, token?: string) {
    return this.request('DELETE', path, undefined, token);
  }

  // Base request method.
  private async request(
    method: HttpMethod,
    path: string,
    data?: unknown,
    token?: string,
    query?: Record<string, string>
  ) {
    try {
      let req = request[method.toLowerCase()](path);

      // Query params
      if (query) {
        req = req.query(query);
      }

      // Auth
      if (token) {
        req = req.set('Authorization', `Bearer ${token}`);
      }

      // Data for POST/PUT
      if (data) {
        req = req
          .send(data)
          .set('Content-Type', 'application/json');
      }

      // Timeout
      req = req.timeout(this.defaultTimeout);

      const response = await req;
      
      logger.debug({ 
        method,
        path,
        status: response.status,
        duration: response.duration 
      }, 'API request');

      return response;
    } catch (error) {
      // Handle timeout vs other errors
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
        error: (error instanceof Error) ? error.message : String(error)
      });
    }
  }

  // Realistic token creation
  createTestToken(userId: string, role: string = 'user'): string {
    return Buffer.from(
      JSON.stringify({ 
        userId, 
        role, 
        exp: Date.now() + 3600000 
      })
    ).toString('base64');
  }

  // Helper for common headers
  getDefaultHeaders(token?: string): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }
}

// Single instance for all tests
export const testApi = new TestApi();