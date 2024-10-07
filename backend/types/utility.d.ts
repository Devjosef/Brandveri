// types for utils

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type PaginatedResponse<T> = {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    items: T[];
};
