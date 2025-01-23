import { integration } from '../integrationUtility';
import { testApi } from '../../api/baseApi';

describe('Payment Integration', () => {
  beforeEach(async () => {
    await integration.cleanup();
  });

  it('completes full payment flow', async () => {
    // Creates a user
    const { token } = await integration.createUser();

    // Creates a trademark (to pay for).
    const trademark = await integration.createTrademark(token);

    // Processes a payment.
    const paymentResponse = await testApi.post('/api/payments', {
      trademarkId: trademark.id,
      amount: 99.99,
      currency: 'USD',
      cardToken: 'tok_visa'
    }, token);
    expect(paymentResponse.status).toBe(200);
    expect(paymentResponse.body.status).toBe('succeeded');

    // Verifies that the trademark status is updated.
    const trademarkResponse = await testApi.get(
      `/api/trademarks/${trademark.id}`, 
      token
    );
    expect(trademarkResponse.body.status).toBe('PAID');

    // Verifies that there is a payment record.
    const paymentRecord = await testApi.get(
      `/api/payments/${paymentResponse.body.id}`, 
      token
    );
    expect(paymentRecord.body.status).toBe('succeeded');
    expect(paymentRecord.body.amount).toBe(99.99);
  });

  it('handles payment race conditions', async () => {
    const { token } = await integration.createUser();
    const trademark = await integration.createTrademark(token);

    // Multiple payments for the same trademark.
    const results = await Promise.all([
      testApi.post('/api/payments', {
        trademarkId: trademark.id,
        amount: 99.99,
        cardToken: 'tok_visa'
      }, token),
      testApi.post('/api/payments', {
        trademarkId: trademark.id,
        amount: 99.99,
        cardToken: 'tok_visa'
      }, token)
    ]);

    // Only one should succeed.
    const successes = results.filter((r: { status: number; }) => r.status === 200);
    expect(successes).toHaveLength(1);
  });
});