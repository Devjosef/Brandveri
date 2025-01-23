import { testApi } from '../baseApi';
import { testDb } from '../../database/dbTest';

describe('Auth API', () => {
  beforeEach(async () => {
    await testDb.cleanup(['users']);
  });

  it('logs in user', async () => {
    const response = await testApi.post('/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  it('handles invalid credentials', async () => {
    const response = await testApi.post('/api/auth/login', {
      email: 'test@example.com',
      password: 'wrong'
    });

    expect(response.status).toBe(401);
  });
});