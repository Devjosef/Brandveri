// Global types

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface PaginationParams {
    page: number;
    limit: number;
}
