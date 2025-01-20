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

export type NiceClassificationType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 
    11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 
    21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 
    31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 
    41 | 42 | 43 | 44 | 45;

export enum NiceClassification {
    CLASS_1 = 1,
    CLASS_2 = 2,
    CLASS_3 = 3,
    CLASS_4 = 4,
    CLASS_5 = 5,
    CLASS_6 = 6,
    CLASS_7 = 7,
    CLASS_8 = 8,
    CLASS_9 = 9,
    CLASS_10 = 10,
    CLASS_11 = 11,
    CLASS_12 = 12,
    CLASS_13 = 13,
    CLASS_14 = 14,
    CLASS_15 = 15,
    CLASS_16 = 16,
    CLASS_17 = 17,
    CLASS_18 = 18,
    CLASS_19 = 19,
    CLASS_20 = 20,
    CLASS_21 = 21,
    CLASS_22 = 22,
    CLASS_23 = 23,
    CLASS_24 = 24,
    CLASS_25 = 25,
    CLASS_26 = 26,
    CLASS_27 = 27,
    CLASS_28 = 28,
    CLASS_29 = 29,
    CLASS_30 = 30,
    CLASS_31 = 31,
    CLASS_32 = 32,
    CLASS_33 = 33,
    CLASS_34 = 34,
    CLASS_35 = 35,
    CLASS_36 = 36,
    CLASS_37 = 37,
    CLASS_38 = 38,
    CLASS_39 = 39,
    CLASS_40 = 40,
    CLASS_41 = 41,
    CLASS_42 = 42,
    CLASS_43 = 43,
    CLASS_44 = 44,
    CLASS_45 = 45
}

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

export interface TrademarkSearchResult {
    id: string;
    name: string;
    status: TrademarkStatus;
    owner: string;
    filingDate: Date;
    registrationDate?: Date;
    niceClasses: NiceClassification[];
    similarity?: number;
}

export interface TrademarkDetails extends TrademarkSearchResult {
    description?: string;
    goods_services?: string[];
    representatives?: string[];
    history?: TrademarkHistoryEntry[];
}

export interface TrademarkHistoryEntry {
    date: Date;
    action: string;
    description: string;
}
