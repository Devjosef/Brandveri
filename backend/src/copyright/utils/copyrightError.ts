/**
 * CopyrightErrorCode
 * Reasoning: Enumerate specific error codes for clarity and consistency.
 */
export enum CopyrightErrorCode {
    SEARCH_ERROR = 'SEARCH_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    GITHUB_API_ERROR = 'GITHUB_API_ERROR',
    CACHE_ERROR = 'CACHE_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    INITIALIZATION_ERROR = "INITIALIZATION_ERROR"
}

/**
 * CopyrightError
 * Reasoning: Custom error class to encapsulate error codes and messages.
 */
export class CopyrightError extends Error {
    public code: CopyrightErrorCode;
    public details?: Record<string, unknown>;

    constructor(code: CopyrightErrorCode, message: string, details?: Record<string, unknown>) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'CopyrightError';
    }
}