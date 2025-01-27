// Common trademark types
export type TrademarkStatus = 'REGISTERED' | 'PENDING' | 'REJECTED';


export interface TrademarkSearchResult {
    serialNumber: string;
    registrationNumber: string;
    status: TrademarkStatus;
    filingDate: string;
    niceClasses: number[];
    owner: { 
        name: string;
        country: string;
    };
}

// USPTO specific types
export interface USPTOResponse {
    status: number;
    data?: {
        trademarks: TrademarkSearchResult[];
    };
    error?: {
      code: string;
      message: string;
      retryAfter?: number;  
    };
}

// EUIPO specific types
export interface EUIPOResponse {
    status: number;
    data?: {
        trademarks: TrademarkSearchResult[];
    };
    error?: {
        code: string;
        message: string;
    };
}