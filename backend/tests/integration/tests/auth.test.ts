import { testApi } from '../../api/baseApi';
import { integration } from '../integrationUtility';

describe('Auth Integration', () => {
  beforeEach(async () => {
    await integration.cleanup();
  });

  it('completes registration and login flow', async () => {
    // Register
    const registerResponse = await testApi.post('/api/auth/register', {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
    expect(registerResponse.status).toBe(201);

    // Login
    const loginResponse = await testApi.post('/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    // Use a token
    const profileResponse = await testApi.get(
      '/api/users/me',
      loginResponse.body.token
    );
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.email).toBe('test@example.com');
  });

  it('handles invalid credentials', async () => {
    // Register first
    await testApi.post('/api/auth/register', {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });

    // Try the wrong password.
    const response = await testApi.post('/api/auth/login', {
      email: 'test@example.com',
      password: 'wrong'
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('prevents duplicate registration', async () => {
    // First registration.
    await testApi.post('/api/auth/register', {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });

    // Try a duplicate.
    const response = await testApi.post('/api/auth/register', {
      email: 'test@example.com',
      password: 'different',
      name: 'Another User'
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Email already registered');
  });

  it('handles password reset flow', async () => {
    // Register.
    await testApi.post('/api/auth/register', {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });

    // Request reset.
    const resetResponse = await testApi.post('/api/auth/reset-request', {
      email: 'test@example.com'
    });
    expect(resetResponse.status).toBe(200);

    // Get reset token from test mailer.
    const resetToken = await integration.getLastResetToken('test@example.com');

    // Reset password.
    const response = await testApi.post('/api/auth/reset-password', {
      token: resetToken,
      password: 'newpassword123'
    });
    expect(response.status).toBe(200);

    // Login with a new password.
    const loginResponse = await testApi.post('/api/auth/login', {
      email: 'test@example.com',
      password: 'newpassword123'
    });
    expect(loginResponse.status).toBe(200);
  });

  it('handles concurrent login attempts', async () => {
    const { email } = await integration.createUser();
    
    // Try multiple logins simultaneously
    const results = await Promise.all([
      testApi.post('/api/auth/login', { email, password: 'password123' }),
      testApi.post('/api/auth/login', { email, password: 'password123' }),
      testApi.post('/api/auth/login', { email, password: 'password123' })
    ]);
    
    results.forEach((res: { status: any; }) => expect(res.status).toBe(200));
  });

  it('handles session invalidation', async () => {
    const { token } = await integration.createUser();
    
    // Logout
    await testApi.post('/api/auth/logout', {}, token);
    
    // Try using invalidated token
    const response = await testApi.get('/api/users/me', token);
    expect(response.status).toBe(401);
  });
});