import { AuthServiceMock } from './types/authTypes';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

// Mock responses
const mock_tokens = {
  valid: {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    token_type: 'Bearer',
    expires_in: 3600
  } as const,
  
  expired: {
    error: {
      code: 'token_expired',
      message: 'Token has expired',
      status: 401
    }
  } as const,
  
  invalid: {
    error: {
      code: 'invalid_token',
      message: 'Token is invalid',
      status: 401
    }
  } as const
};

// Mock decoded tokens
const mock_decoded = {
  valid: {
    sub: 'user_123',
    email: 'test@example.com',
    roles: ['user'],
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  } as const,
  
  admin: {
    sub: 'admin_123',
    email: 'admin@example.com',
    roles: ['admin', 'user'],
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  } as const
};

export const createAuthMock = (scenario: 'valid' | 'expired' | 'invalid' = 'valid') => {
  logger.debug({ mock: 'auth', scenario }, 'Creating auth mock');

  const mock: AuthServiceMock = {
    verifyToken: jest.fn().mockImplementation(async () => {
      if (scenario === 'expired') {
        throw mock_tokens.expired.error;
      }
      if (scenario === 'invalid') {
        throw mock_tokens.invalid.error;
      }
      return mock_decoded.valid;
    }),

    generateToken: jest.fn().mockImplementation(async () => {
      if (scenario === 'valid') {
        return mock_tokens.valid;
      }
      throw mock_tokens[scenario].error;
    }),

    refreshToken: jest.fn().mockImplementation(async () => {
      if (scenario === 'valid') {
        return mock_tokens.valid;
      }
      throw mock_tokens[scenario].error;
    }),

    revokeToken: jest.fn().mockResolvedValue(undefined),

    validateRequest: jest.fn().mockImplementation(async () => {
      return scenario === 'valid';
    })
  };

  return mock;
};

// Default instance
export const authMock = createAuthMock();

// Helper for testing different roles
export const createAuthMockWithRole = (roles: string[]) => {
  const mock = createAuthMock();
  mock.verifyToken.mockResolvedValue({
    ...mock_decoded.valid,
    roles
  });
  return mock;
};
