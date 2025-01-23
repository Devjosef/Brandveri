import { testApi } from '../api/baseApi';
import { testDb } from '../setup/setup';
import { testRedis } from '../setup/setup';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

/**
 * Integration test utilities.
 */
export const integration = {
  // Clean test data.
  async cleanup() {
    try {
      await Promise.all([
        testDb.query('TRUNCATE TABLE users, trademarks, payments CASCADE'),
        testRedis.flushdb()
      ]);
      logger.debug('Test data cleaned');
    } catch (error) {
      logger.error({ error }, 'Cleanup failed');
      throw error; // Fail fast on cleanup errors.
    }
  },

  // User creation helper.
  async createUser(email = 'test@example.com') {
    const response = await testApi.post('/api/users', {
      email,
      password: 'password123',
      name: 'Test User'
    });

    if (response.status !== 201) {
      throw new Error(`User creation failed: ${response.status}`);
    }

    return {
      token: testApi.createTestToken(response.body.id),
      userId: response.body.id,
      email
    };
  },

  // Trademark creation helper.
  async createTrademark(token: string, name = 'Test Brand') {
    const response = await testApi.post('/api/trademarks', {
      name,
      niceClasses: [9, 42] // Common classes for testing.
    }, token);

    if (response.status !== 201) {
      throw new Error(`Trademark creation failed: ${response.status}`);
    }

    return response.body;
  },

  // Payment creation helper.
  async createPayment(token: string, amount = 99.99) {
    const response = await testApi.post('/api/payments', {
      amount,
      currency: 'USD',
      cardToken: 'tok_visa'
    }, token);

    if (response.status !== 200) {
      throw new Error(`Payment creation failed: ${response.status}`);
    }

    return response.body;
  },

  // Get last email token (for password reset tests).
  async getLastResetToken(email: string) {
    const token = await testRedis.get(`reset:${email}`);
    if (!token) throw new Error('Reset token not found');
    return token;
  },

  async createCopyright(token: string, name = 'Test Copyright') {
    const response = await testApi.post('/api/copyrights', {
      name,
      type: 'original_work',
      description: 'Test description'
    }, token);
    
    if (response.status !== 201) {
      throw new Error(`Copyright creation failed: ${response.status}`);
    }
    return response.body;
  },

  async setMarketTrend(industry: string, trends: {
    trending: string[],
    declining: string[]
  }) {
    await testRedis.set(
      `trends:${industry}`, 
      JSON.stringify(trends)
    );
  }
};