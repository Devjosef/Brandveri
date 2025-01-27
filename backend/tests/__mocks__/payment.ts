import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

// Mock responses
const paymentResponses = {
  success: {
    status: 'succeeded',
    id: 'ch_123456789',
    amount: 9999, // Amount in cents.
    currency: 'USD',
    created: 1624459200, // Unix timestamp.
    metadata: {
      trademarkId: 'tm_123',
      niceClasses: '[9,42]'
    }
  },
  declined: {
    status: 'failed',
    error: {
      code: 'card_declined',
      message: 'Your card was declined',
      decline_code: 'insufficient_funds'
    }
  },
  error: {
    status: 'error',
    error: {
      code: 'rate_limit_exceeded',
      message: 'Too many requests. Please try again in 60 seconds'
    }
  }
} as const;

// Mock factory
export const createPaymentGatewayMock = (scenario: 'success' | 'declined' | 'error' = 'success') => {
  logger.debug({ mock: 'payment', scenario }, 'Creating payment gateway mock');
  
  return {
    charges: {
      create: jest.fn().mockResolvedValue(paymentResponses[scenario]),
      retrieve: jest.fn().mockResolvedValue(paymentResponses[scenario]),
      refund: jest.fn().mockResolvedValue({ 
        ...paymentResponses[scenario], 
        status: 'refunded' 
      })
    },
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_123456789',
        email: 'test@example.com'
      }),
      update: jest.fn().mockResolvedValue({
        id: 'cus_123456789',
        email: 'test@example.com'
      })
    },
    tokens: {
      create: jest.fn().mockResolvedValue({
        id: 'tok_visa',
        card: {
          last4: '4242',
          brand: 'visa'
        }
      })
    }
  };
};

// Default instance
export const paymentGatewayMock = createPaymentGatewayMock();
