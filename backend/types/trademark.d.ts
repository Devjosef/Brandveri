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

export enum TrademarkErrorCode {
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
    INVALID_JURISDICTION = 'INVALID_JURISDICTION',
    API_ERROR = 'API_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    CACHE_ERROR = 'CACHE_ERROR',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export type NiceClassification = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 
    11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 
    21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 
    31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 
    41 | 42 | 43 | 44 | 45;

export type JurisdictionType = 'USPTO' | 'EUIPO';

export interface ResponseMetadata {
    requestId: string;
    timestamp: Date;
    path: string;
    correlationId?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
}

export interface BaseResponse {
    success: boolean;
    version: string;
    metadata: ResponseMetadata;
}

export interface TrademarkSearchParams {
    query: string;
    page?: number;
    limit?: number;
    status?: TrademarkStatus[];
    niceClasses?: NiceClassification[];
    jurisdiction?: JurisdictionType[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    sortBy?: 'relevance' | 'name' | 'registrationDate' | 'status' | 'owner';
    sortOrder?: 'asc' | 'desc';
}

export interface Trademark {
    id: string;
    name: string;
    status: TrademarkStatus;
    registrationNumber?: string;
    applicationNumber: string;
    filingDate: Date;
    registrationDate?: Date;
    expiryDate?: Date;
    owner: {
        name: string;
        address: string;
        type: 'individual' | 'company';
        identifier?: string;
    };
    niceClasses: NiceClassification[];
    jurisdiction: JurisdictionType;
    description?: string;
    goods_services: string[];
    similarityScore?: number;
    lastUpdated: Date;
}

export interface TrademarkError {
    code: TrademarkErrorCode;
    message: string;
    details?: unknown;
}

export interface TrademarkResponse extends BaseResponse {
    data: Trademark | Trademark[];
    similarMarks?: Array<{
        trademark: Trademark;
        score: number;
        matchingFactors: {
            visual: number;
            phonetic: number;
            semantic: number;
            niceClassOverlap: number;
        };
    }>;
}

export interface TrademarkCacheKey {
    prefix: 'trademark';
    type: 'search' | 'registration' | 'analysis' | 'monitoring';
    hash: string;
    timestamp: number;
    segment: number;
    jurisdiction?: JurisdictionType[];
}
