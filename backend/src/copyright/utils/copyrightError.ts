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
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    GITHUB_API_ERROR = 'GITHUB_API_ERROR',
    INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
    CIRCUIT_BREAKER_ERROR = 'CIRCUIT_BREAKER_ERROR',
    SHUTDOWN_ERROR = 'SHUTDOWN_ERROR',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    CACHE_ERROR = 'CACHE_ERROR',
    DATA_TRANSFORMATION_ERROR = 'DATA_TRANSFORMATION_ERROR',
    SERVICE_DEGRADED = 'SERVICE_DEGRADED',
    RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED'
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
        if (typeof code === 'number' && code < 500) return ErrorCategory.CLIENT;
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