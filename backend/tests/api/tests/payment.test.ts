import { testApi } from '../baseApi';
import { mocks } from '../../__mocks__';

const { payment: stripeGatewayMock } = mocks;

describe('Stripe API Integration', () => {
  beforeEach(() => {
    // Reset all mock implementations and history
    jest.clearAllMocks();
    Object.values(stripeGatewayMock).forEach(mockGroup => {
      Object.values(mockGroup).forEach(mock => {
        mock.mockReset();
      });
    });
  });

  it('should process trademark filing payment', async () => {
    const paymentData = {
      amount: 350.00,
      currency: 'USD',
      paymentMethodId: 'pm_card_visa'
    };

    stripeGatewayMock.charges.create.mockResolvedValueOnce({
      id: 'ch_123',
      status: 'succeeded',
      amount: 35000,
      currency: 'usd'
    });

    const response = await testApi.post('/api/payments', paymentData);
    expect(response.status).toBe(200);
    expect(stripeGatewayMock.charges.create).toHaveBeenCalled();
  });
});