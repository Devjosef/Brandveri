import '@testing-library/jest-dom';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

// Global test configuration.
beforeAll(() => {
  // Suppresses noisy logs, keeps important ones.
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
  
  
  logger.info('Test suite started');
  
  // Reasonable timeouts
  jest.setTimeout(5000); 
  
  // Sets the test environment.
  process.env.NODE_ENV = 'test';
});

// Resets everything between tests.
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();
  
  // Resets timers if used during tests.
  jest.useRealTimers();
  
  // Clear test env variables.
  process.env.TEST_OVERRIDE = undefined;
});

// Cleanup after all tests.
afterAll(() => {
  logger.info('Test suite completed');
});

// Global error handler for unhandled promises.
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Promise Rejection:', error);
  process.exit(1); // Fail tests on unhandled rejections
});