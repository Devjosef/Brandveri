// Types for copyright

export interface Copyright {
    id: number;
    title: string;
    owner: string;
    author: string;
    registration_number: string;
    registration_date: Date;
    status: CopyrightStatus;
    country: string;
    created_at: Date;
    updated_at: Date;
}

export interface CopyrightRegistration {
    title: string;
    author: string;
    registration_number: string;
    registration_date: Date;
    status: CopyrightStatus;
    country: string;
}

export interface CopyrightSearchParams {
    query: string;
    page?: number;
    limit?: number;
    sortBy?: 'title' | 'author' | 'registration_date';
    sortOrder?: 'asc' | 'desc';
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    metadata?: {
        timestamp: string;
        requestId: string;
    };
}

export enum CopyrightStatus {
    PENDING = 'pending',
    REGISTERED = 'registered',
    REJECTED = 'rejected',
    EXPIRED = 'expired',
    ABANDONED = 'abandoned'
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}
