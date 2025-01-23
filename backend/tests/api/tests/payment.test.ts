import { testApi } from '../baseApi';
import { testDb } from '../../database/dbTest';

describe('Payment API', () => {
  beforeEach(async () => {
    await testDb.cleanup(['payments']);
  });

  it('processes payment', async () => {
    const token = testApi.createTestToken('user123', 'user');
    const response = await testApi.post('/api/payments', {
      amount: 99.99,
      currency: 'USD',
      cardToken: 'tok_visa'
    }, token);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('succeeded');
  });

  it('handles declined payment', async () => {
    const token = testApi.createTestToken('user123', 'user');
    const response = await testApi.post('/api/payments', {
      amount: 99.99,
      currency: 'USD',
      cardToken: 'tok_chargeDeclined'
    }, token);

    expect(response.status).toBe(402);
  });
});