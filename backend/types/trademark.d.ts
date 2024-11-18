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
    CLASS_1 = '1',    // Chemicals
    CLASS_2 = '2',    // Paints
    CLASS_3 = '3',    // Cosmetics and cleaning preparations
    CLASS_4 = '4',    // Industrial oils and greases
    CLASS_5 = '5',    // Pharmaceuticals
    CLASS_6 = '6',    // Common metals
    CLASS_7 = '7',    // Machines and machine tools
    CLASS_8 = '8',    // Hand tools and implements
    CLASS_9 = '9',    // Electronic and scientific apparatus
    CLASS_10 = '10',  // Medical apparatus
    CLASS_11 = '11',  // Lighting and heating equipment
    CLASS_12 = '12',  // Vehicles
    CLASS_13 = '13',  // Firearms
    CLASS_14 = '14',  // Precious metals and jewelry
    CLASS_15 = '15',  // Musical instruments
    CLASS_16 = '16',  // Paper goods and printed matter
    CLASS_17 = '17',  // Rubber goods
    CLASS_18 = '18',  // Leather goods
    CLASS_19 = '19',  // Non-metallic building materials
    CLASS_20 = '20',  // Furniture
    CLASS_21 = '21',  // Housewares and glass
    CLASS_22 = '22',  // Cordage and fibers
    CLASS_23 = '23',  // Yarns and threads
    CLASS_24 = '24',  // Fabrics
    CLASS_25 = '25',  // Clothing
    CLASS_26 = '26',  // Fancy goods
    CLASS_27 = '27',  // Floor coverings
    CLASS_28 = '28',  // Toys and sporting goods
    CLASS_29 = '29',  // Meats and processed foods
    CLASS_30 = '30',  // Staple foods
    CLASS_31 = '31',  // Natural agricultural products
    CLASS_32 = '32',  // Light beverages
    CLASS_33 = '33',  // Wines and spirits
    CLASS_34 = '34',  // Smokers' articles
    CLASS_35 = '35',  // Advertising and business services
    CLASS_36 = '36',  // Insurance and financial services
    CLASS_37 = '37',  // Building construction and repair
    CLASS_38 = '38',  // Telecommunications
    CLASS_39 = '39',  // Transportation and storage
    CLASS_40 = '40',  // Treatment of materials
    CLASS_41 = '41',  // Education and entertainment
    CLASS_42 = '42',  // Computer and scientific services
    CLASS_43 = '43',  // Hotels and restaurants
    CLASS_44 = '44',  // Medical and beauty services
    CLASS_45 = '45'   // Personal and legal services
}

export enum NiceClassification {
    CLASS_1 = 1,    // Chemicals for industry, science
    CLASS_2 = 2,    // Paints, varnishes, lacquers
    CLASS_3 = 3,    // Cleaning preparations, cosmetics
    CLASS_4 = 4,    // Industrial oils, lubricants
    CLASS_5 = 5,    // Pharmaceuticals, medical preparations
    CLASS_6 = 6,    // Common metals and their alloys
    CLASS_7 = 7,    // Machines, machine tools, motors
    CLASS_8 = 8,    // Hand tools and implements
    CLASS_9 = 9,    // Scientific and technological apparatus
    CLASS_10 = 10,  // Medical and veterinary apparatus
    CLASS_11 = 11,  // Apparatus for lighting, heating
    CLASS_12 = 12,  // Vehicles and transportation
    CLASS_13 = 13,  // Firearms, ammunition
    CLASS_14 = 14,  // Precious metals and jewelry
    CLASS_15 = 15,  // Musical instruments
    CLASS_16 = 16,  // Paper, cardboard, printed matter
    CLASS_17 = 17,  // Rubber, gutta-percha, plastics
    CLASS_18 = 18,  // Leather and imitations
    CLASS_19 = 19,  // Building materials (non-metallic)
    CLASS_20 = 20,  // Furniture, mirrors, frames
    CLASS_21 = 21,  // Household or kitchen utensils
    CLASS_22 = 22,  // Ropes, string, nets, tents
    CLASS_23 = 23,  // Yarns and threads
    CLASS_24 = 24,  // Textiles and substitutes
    CLASS_25 = 25,  // Clothing, footwear, headwear
    CLASS_26 = 26,  // Lace, braid, buttons, pins
    CLASS_27 = 27,  // Carpets, rugs, mats
    CLASS_28 = 28,  // Games, toys, sporting articles
    CLASS_29 = 29,  // Meat, fish, poultry
    CLASS_30 = 30,  // Coffee, tea, cocoa
    CLASS_31 = 31,  // Raw agricultural products
    CLASS_32 = 32,  // Beers, non-alcoholic beverages
    CLASS_33 = 33,  // Alcoholic beverages
    CLASS_34 = 34,  // Tobacco, smokers' articles
    CLASS_35 = 35,  // Advertising, business management
    CLASS_36 = 36,  // Insurance, financial affairs
    CLASS_37 = 37,  // Building construction, repair
    CLASS_38 = 38,  // Telecommunications
    CLASS_39 = 39,  // Transport, packaging of goods
    CLASS_40 = 40,  // Treatment of materials
    CLASS_41 = 41,  // Education, entertainment
    CLASS_42 = 42,  // Scientific and technological services
    CLASS_43 = 43,  // Services for food and drink
    CLASS_44 = 44,  // Medical services, beauty care
    CLASS_45 = 45   // Legal services, security services
}

/**
 * Base response interface for all Trademark API responses
 * @interface BaseResponse
 * @version 1.0.0
 */
export interface BaseResponse {
    /** Indicates if the operation was successful */
    success: boolean;
    /** API version */
    version: string;
    /** Error information if success is false */
    error?: {
      /** Error code for programmatic handling */
      code: TrademarkErrorCode;
      /** Human-readable error message */
      message: string;
      /** Additional error details */
      details?: unknown;
    };
  }

export interface Trademark {
    id: number;
    name: string;
    owner: {
        name: string;
        address: string;
        type: 'individual' | 'company';
      };
    registrationNumber?: string;
    registrationDate: Date;
    expirationDate?: Date;
    status: TrademarkStatus;
    classes: TrademarkClass[];
    niceClasses: NiceClassification[];
    classDescriptions?: Record<string, string>;
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
    niceClasses?: NiceClassification[];
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
    niceClasses: NiceClassification[];
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
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
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
