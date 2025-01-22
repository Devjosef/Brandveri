import { readFile } from 'fs/promises';
import path from 'path';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

type MockType = 'uspto' | 'payment-gateway' | 'cache' | 'database';

/**
 * Load mock responses for external services
 */
export const loadMock = async <T>(
  service: MockType, 
  scenario: string
): Promise<T> => {
  try {
    const data = await readFile(
      path.join(__dirname, `data/${service}/${scenario}.json`), 
      'utf8'
    );
    logger.debug({ mock: service, scenario }, 'Mock loaded');
    return JSON.parse(data);
  } catch (error) {
    logger.error({ error, mock: service, scenario }, 'Failed to load mock');
    throw error;
  }
};

// Common mock responses
export const mockResponses = {
  uspto: {
    success: {
      status: 200,
      data: {
        trademarks: [
          {
            serialNumber: "12345",
            registrationNumber: "ABC123",
            status: "REGISTERED"
          }
        ]
      }
    },
    error: {
      status: 429,
      error: "Rate limit exceeded"
    }
  },
  paymentGateway: {
    success: {
      status: "COMPLETED",
      transactionId: "txn_123",
      amount: 99.99
    },
    error: {
      status: "FAILED",
      error: "Card declined"
    }
  }
};
