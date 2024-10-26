// Types for copyright

export interface Copyright {
    id: number;
    title: string;
    owner: string;
    registrationDate: Date;
}

export interface CopyrightRegistration {
    title: string;
    author: string;
    registration_number: string;
    registration_date: Date;
    status?: string;
    country?: string;
    owner: string;
}

export interface CopyrightSearchParams {
    query: string;
    page?: number;
    limit?: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
