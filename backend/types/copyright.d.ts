// Types for copyright

export interface Copyright {
    id: number;
    title: string;
    owner: string;
    registrationDate: Date;
}

export interface CopyrightRegistration {
    title: string;
    owner: string;
    registrationDate: Date;
}

export interface CopyrightSearchParams {
    query: string;
    page?: number;
    limit?: number;
}
