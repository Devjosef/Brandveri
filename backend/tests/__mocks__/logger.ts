import { 
  LoggerServiceMock, 
  LogLevel, 
  LogEntry, 
  LogMetadata 
} from './types/loggerTypes';

export const createLoggerMock = (): LoggerServiceMock => {
  // Store logs in-memory for verification
  const logs: LogEntry[] = [];

  const logMessage = (
    level: LogLevel, 
    message: string | Error, 
    metadata?: LogMetadata
  ) => {
    logs.push({
      level,
      message: message instanceof Error ? message.message : message,
      timestamp: Date.now(),
      metadata: metadata || (message instanceof Error ? { error: message } : undefined)
    });
  };

  const mock: LoggerServiceMock = {
    error: jest.fn((message: string | Error, metadata?: LogMetadata) => {
      logMessage('error', message, metadata);
    }),

    warn: jest.fn((message: string, metadata?: LogMetadata) => {
      logMessage('warn', message, metadata);
    }),

    info: jest.fn((message: string, metadata?: LogMetadata) => {
      logMessage('info', message, metadata);
    }),

    debug: jest.fn((message: string, metadata?: LogMetadata) => {
      logMessage('debug', message, metadata);
    }),

    trace: jest.fn((message: string, metadata?: LogMetadata) => {
      logMessage('trace', message, metadata);
    }),

    clear: jest.fn(() => {
      logs.length = 0;
    }),

    getLogs: jest.fn(() => [...logs]),

    getLogsByLevel: jest.fn((level: LogLevel) => 
      logs.filter(log => log.level === level)
    )
  };

  return mock;
};

// Default instance
export const loggerMock = createLoggerMock();
