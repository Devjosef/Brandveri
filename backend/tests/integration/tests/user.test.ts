import { integration } from '../integrationUtility';
import { testApi } from '../../api/baseApi';

describe('User Integration', () => {
  beforeEach(async () => {
    await integration.cleanup();
  });

  it('completes full user flow', async () => {
    // Creates a user.
    const { token } = await integration.createUser();

    // Updates the profile.
    const updateResponse = await testApi.put('/api/users/me', {
      name: 'Updated Name',
      company: 'Test Corp'
    }, token);
    expect(updateResponse.status).toBe(200);

    // Get the updated profile.
    const profileResponse = await testApi.get('/api/users/me', token);
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.name).toBe('Updated Name');
    expect(profileResponse.body.company).toBe('Test Corp');

    // Verifies it by checking the database.
    const dbUser = await testApi.get(`/api/users/${profileResponse.body.id}`, token);
    expect(dbUser.body.name).toBe('Updated Name');
  });

  it('handles user deletion with active trademarks', async () => {
    const { token, userId } = await integration.createUser();
    await integration.createTrademark(token);
    
    // Try deleting user
    const response = await testApi.delete(`/api/users/${userId}`, token);
    
    // Should fail or handle cascading
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('User has active trademarks');
  });
});