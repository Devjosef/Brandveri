export interface Trademark {
    id: number;
    name: string;
    owner: string;
    registrationDate: Date;
    // Add other fields as necessary
}

export interface TrademarkSearchParams {
    query: string;
    page?: number;
    limit?: number;
}

export interface TrademarkRegistration {
    name: string;
    owner: string;
    registrationDate: Date;
    // Add other fields as necessary
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
