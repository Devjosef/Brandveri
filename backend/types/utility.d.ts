/**
 * BrandVeri Utility Types
 * Common type utilities for use across the application
 */

// Basic type utilities
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Object type utilities
export type DeepNullable<T> = {
    [K in keyof T]: T[K] extends object ? DeepNullable<T[K]> : Nullable<T[K]>;
};

export type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// Function type utilities
export type AsyncFunction<T, R> = (arg: T) => Promise<R>;
export type SyncFunction<T, R> = (arg: T) => R;

// Pagination utilities
export interface PaginationOptions {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    items: T[];
    metadata: {
        totalItems: number;
        totalPages: number;
        currentPage: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

// Record type utilities
export type RecordKey = string | number | symbol;
export type SafeRecord<K extends RecordKey, T> = Partial<Record<K, T>>;

// Validation utilities
export type ValidationResult<T> = {
    isValid: boolean;
    data?: T;
    errors?: string[];
};

// API response utilities
export type ApiSuccessResponse<T> = {
    success: true;
    data: T;
    metadata?: Record<string, unknown>;
};

export type ApiErrorResponse = {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;