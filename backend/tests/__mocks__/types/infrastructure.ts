// Database types
export interface DatabaseMock {
    query: jest.Mock;
    transaction: jest.Mock;
    connect: jest.Mock;
    disconnect: jest.Mock;
    clear: jest.Mock;
}

// Cache types
export interface CacheMock {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    clear: jest.Mock;
    connect: jest.Mock;
    disconnect: jest.Mock;
}

// Common response types
export type MockResponse<T> = {
    success: T;
    error: {
        code: string;
        message: string;
    };
}