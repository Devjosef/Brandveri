import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

// Mock responses
//** Creates a mock of the USPTO client */
const usptoResponses = {
  success: {
    status: 200,
    data: {
      trademarks: [{
        serialNumber: "88123456",
        registrationNumber: "5123456",
        status: "REGISTERED",
        filingDate: "2024-01-15",
        niceClasses: [9, 42],
        owner: {
          name: "Example Inc",
          country: "US"
        }
      }]
    }
  },
  error: {
    status: 429,
    error: {
      code: "RATE_LIMIT",
      message: "Rate limit exceeded",
      retryAfter: 60
    }
  }
} as const;

//** Creates a mock of the EUIPO client */
const euipoResponses = {
  success: {
    status: 200,
    data: {
      trademarks: [{
        serialNumber: "018123456",
        registrationNumber: "EUTM-123456",
        status: "REGISTERED",
        filingDate: "2024-01-15",
        niceClasses: [9, 42],
        owner: {
          name: "Example Corp",
          country: "DE"
        }
      }]
    }
  },
  error: {
    status: 429,
    error: {
      code: "RATE_LIMIT",
      message: "Rate limit exceeded"
    }
  }
} as const;

// Mock factories
export const createUSPTOMock = (scenario: 'success' | 'error' = 'success') => {
  logger.debug({ mock: 'uspto', scenario }, 'Creating USPTO mock');
  
  return {
    search: jest.fn().mockResolvedValue(usptoResponses[scenario]),
    verify: jest.fn().mockResolvedValue(usptoResponses[scenario])
  };
};

export const createEUIPOMock = (scenario: 'success' | 'error' = 'success') => {
  logger.debug({ mock: 'euipo', scenario }, 'Creating EUIPO mock');
  
  return {
    search: jest.fn().mockResolvedValue(euipoResponses[scenario]),
    verify: jest.fn().mockResolvedValue(euipoResponses[scenario])
  };
};

// Default instances
export const usptoMock = createUSPTOMock();
export const euipoMock = createEUIPOMock();
