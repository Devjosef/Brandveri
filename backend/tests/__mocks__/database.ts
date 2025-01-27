import { DatabaseMock } from './types/infrastructure';
import { loggers } from 'backend/observability/contextLoggers';

const logger = loggers.test

export const createDatabaseMock = (): DatabaseMock => {
    const mock: DatabaseMock = {
        query: jest.fn(),
        transaction: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn().mockResolvedValue(undefined)
    };

    logger.debug('Database mock created');
    return mock;
};

// Default instance 
export const dbMock = createDatabaseMock