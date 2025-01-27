import { CacheMock } from './types/infrastructure';
import { loggers } from 'backend/observability/contextLoggers';

const logger = loggers.test;

export const createCacheMock = (): CacheMock => {
    const mock: CacheMock = {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        clear: jest.fn().mockResolvedValue(undefined),
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined)
    }

    logger.debug('Cache mock created');
    return mock;
}

// Default instance
export const cacheMock = createCacheMock();