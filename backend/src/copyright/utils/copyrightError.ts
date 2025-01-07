/**
 * Error categories to distinguish between different error types.
 */
export enum ErrorCategory {
    CLIENT = 'CLIENT',
    SERVER = 'SERVER',
    EXTERNAL = 'EXTERNAL'
}

/**
 * CopyrightErrorCode with corresponding HTTP status codes and categories.
 */
export enum CopyrightErrorCode {
    SEARCH_ERROR = 400,          // Bad Request
    VALIDATION_ERROR = 422,      // Unprocessable Entity
    RATE_LIMIT_ERROR = 429,      // Too Many Requests
    NOT_FOUND = 404,             // Not Found
    GITHUB_API_ERROR = 502,      // Bad Gateway
    CACHE_ERROR = 503,           // Service Unavailable
    UNKNOWN_ERROR = 500,         // Internal Server Error
    INITIALIZATION_ERROR = 500   // Internal Server Error
}

/**
 * Error metadata interface for type safety.
 */
interface ErrorMetadata {
    readonly category: ErrorCategory;
    readonly code: CopyrightErrorCode;
    readonly message: string;
    readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Enhanced CopyrightError with better error handling capabilities.
 */
export class CopyrightError extends Error {
    private readonly metadata: ErrorMetadata;

    constructor(
        code: CopyrightErrorCode,
        message: string,
        details?: Record<string, unknown>
    ) {
        super(message);
        
        // Preserve stack trace.
        Error.captureStackTrace(this, CopyrightError);
        
        this.name = 'CopyrightError';
        this.metadata = Object.freeze({
            category: this.determineCategory(code),
            code,
            message,
            details: details ? Object.freeze({...details}) : undefined
        });
    }

    /**
     * Determine error category based on error code.
     */
    private determineCategory(code: CopyrightErrorCode): ErrorCategory {
        if (code < 500) return ErrorCategory.CLIENT;
        if (code === CopyrightErrorCode.GITHUB_API_ERROR) return ErrorCategory.EXTERNAL;
        return ErrorCategory.SERVER;
    }

    /**
     * Getters for immutable access to error properties.
     */
    public get category(): ErrorCategory {
        return this.metadata.category;
    }

    public get code(): CopyrightErrorCode {
        return this.metadata.code;
    }

    public get details(): Readonly<Record<string, unknown>> | undefined {
        return this.metadata.details;
    }

    /**
     * Serialize error for API responses.
     */
    public toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            category: this.category,
            details: this.details,
            status: this.code // HTTP status code.
        };
    }

    /**
     * Factory method for creating errors with consistent messages.
     */
    public static create(
        code: CopyrightErrorCode,
        messageOrError: string | Error,
        details?: Record<string, unknown>
    ): CopyrightError {
        if (messageOrError instanceof Error) {
            return new CopyrightError(
                code,
                messageOrError.message,
                { ...details, originalError: messageOrError.name }
            );
        }
        return new CopyrightError(code, messageOrError, details);
    }
}