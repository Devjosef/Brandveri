// Global types and augmentations
import { Request } from 'express';
import { AuthError } from '../auth/utils/AuthError';

// Base API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    metadata: ResponseMetadata;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string; // Only in development
}

export interface ResponseMetadata {
    requestId: string;
    timestamp: string;
    version: string;
    environment: Environment;
    processingTime?: number;
}

// Environment type
export type Environment = 'development' | 'staging' | 'production';

// Pagination types
export interface PaginationParams {
    page: number;
    limit: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

// Global error handling types
export interface ErrorWithStatus extends Error {
    statusCode: number;
}

export interface ErrorWithCode extends Error {
    code: string;
}

// Express augmentations
declare global {
    namespace Express {
        interface Request {
            id: string;
            startTime: number;
            context: {
                environment: Environment;
                version: string;
                correlationId?: string;
            };
        }

        interface Response {
            sendError: (error: AuthError) => void;
            sendSuccess: <T>(data: T) => void;
        }
    }
}

// Global utility types
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T> = {
    [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];