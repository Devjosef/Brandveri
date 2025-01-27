// Log levels
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';


// Log metadata
export type LogMetadata = Record<string, unknown>;

// Log entry structure
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: number;
    metadata?: LogMetadata;
}

// Logger interface
export interface LoggerServiceMock {
    error: jest.Mock<void, [string | Error, LogMetadata?]>;
    warn: jest.Mock<void, [string, LogMetadata?]>;
    info: jest.Mock<void, [string, LogMetadata?]>;
    debug: jest.Mock<void, [string, LogMetadata?]>;
    trace: jest.Mock<void, [string, LogMetadata?]>;
    clear: jest.Mock<void>;
    getLogs: jest.Mock<LogEntry[]>;
    getLogsByLevel: jest.Mock<LogEntry[], [LogLevel]>;
  }