import supertest from 'supertest';


/**
 * API testing utilities for making HTTP requests in tests
 */

export const testRequest = supertest(app);

export const apiEndpoints = {
  trademark: {
    search: '/api/v1/trademark/search',
    details: '/api/v1/trademark/details'
  },
  copyright: {
    search: '/api/v1/copyright/search',
    register: '/api/v1/copyright/register'
  },
  auth: {
    login: '/api/v1/auth/login',
    register: '/api/v1/auth/register'
  }
} as const;