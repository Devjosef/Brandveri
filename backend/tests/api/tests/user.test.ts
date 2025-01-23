import { testApi } from '../baseApi';
import { testDb } from '../../database/dbTest';

describe('User API', () => {
  beforeEach(async () => {
    await testDb.cleanup(['users']);
  });

  it('creates user', async () => {
    const response = await testApi.post('/api/users', {
      email: 'new@example.com',
      password: 'password123',
      name: 'Test User'
    });

    expect(response.status).toBe(201);
    expect(response.body.email).toBe('new@example.com');
  });

  it('gets user profile', async () => {
    const token = testApi.createTestToken('user123', 'user');
    const response = await testApi.get('/api/users/me', token);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('user123');
  });
});