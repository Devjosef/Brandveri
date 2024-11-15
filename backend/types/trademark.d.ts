/**
 * BrandVeri Trademark Types
 * Handles trademark registration, monitoring, and management
 */

export enum TrademarkStatus {
    PENDING = 'pending',
    REGISTERED = 'registered',
    REJECTED = 'rejected',
    EXPIRED = 'expired',
    OPPOSED = 'opposed',
    ABANDONED = 'abandoned',
    CANCELLED = 'cancelled'
}

export enum TrademarkClass {
    CLASS_1 = '1',   // Chemicals
    CLASS_9 = '9',   // Electronic devices
    CLASS_35 = '35', // Business services
    CLASS_42 = '42'  // Software and tech services
    // Add other classes as needed
}

export interface Trademark {
    id: number;
    name: string;
    owner: string;
    registrationNumber?: string;
    registrationDate: Date;
    expirationDate?: Date;
    status: TrademarkStatus;
    classes: TrademarkClass[];
    description: string;
    logo?: string;          // URL to logo image
    jurisdiction: string;   // Country/region code
    priority?: {
        date: Date;
        country: string;
        applicationNumber: string;
    };
    metadata?: TrademarkMetadata;
    created_at: Date;
    updated_at: Date;
}

export interface TrademarkSearchParams {
    query: string;
    page?: number;
    limit?: number;
    status?: TrademarkStatus[];
    classes?: TrademarkClass[];
    jurisdiction?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    sortBy?: 'name' | 'registrationDate' | 'status' | 'owner';
    sortOrder?: 'asc' | 'desc';
}

export interface TrademarkRegistration {
    name: string;
    owner: {
        name: string;
        address: string;
        type: 'individual' | 'company';
        identifier?: string;  // Tax ID or company registration
    };
    description: string;
    classes: TrademarkClass[];
    jurisdiction: string;
    logo?: File;
    priority?: {
        date: Date;
        country: string;
        applicationNumber: string;
    };
    declarations: {
        firstUseDate?: Date;
        firstUseInCommerceDate?: Date;
        isInUse: boolean;
    };
}

export interface TrademarkResponse extends ApiResponse<Trademark> {
    similarMarks?: {
        mark: string;
        similarity: number;
        status: TrademarkStatus;
    }[];
    watchlistStatus?: {
        isWatched: boolean;
        addedDate?: Date;
    };
}

export interface TrademarkWatchRequest {
    trademarkId: number;
    userId: string;
    notificationPreferences: {
        email: boolean;
        inApp: boolean;
        frequency: 'immediate' | 'daily' | 'weekly';
    };
    watchCriteria: {
        similarityThreshold: number;
        jurisdictions: string[];
        classes: TrademarkClass[];
    };
}

export enum TrademarkErrorCode {
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
    INVALID_JURISDICTION = 'INVALID_JURISDICTION',
    API_ERROR = 'API_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export interface TrademarkError {
    code: TrademarkErrorCode;
    message: string;
    details?: any;
}

export interface ValidationErrorDetail {
    field: string;
    message: string;
    value?: unknown;
    constraints?: string[];
}

export interface TrademarkValidationError extends TrademarkError {
    code: TrademarkErrorCode.VALIDATION_ERROR;
    details: {
        errors: ValidationErrorDetail[];
        metadata?: Record<string, unknown>;
    };
}

export type TrademarkErrorResponse = {
    success: false;
    error: TrademarkError;
    metadata?: {
        requestId: string;
        timestamp: Date;
        path: string;
    };
};
