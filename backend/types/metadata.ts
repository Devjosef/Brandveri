interface BaseMetadata {
    created_by?: string;
    modified_by?: string;
    version?: number;
    tags?: string[];
  }
  
  export interface CopyrightMetadata extends BaseMetadata {
    original_title?: string;
    derivative_works?: string[];
    contributors?: {
      name: string;
      role: string;
    }[];
    language?: string;
    genre?: string;
  }
  
  export interface RecommendationMetadata extends BaseMetadata {
    confidence_score?: number;
    source_data?: {
      type: string;
      id: string;
      timestamp: Date;
    };
    related_items?: {
      type: string;
      id: string;
      relationship: string;
    }[];
    analysis_details?: {
      method: string;
      factors: string[];
      weight: number;
    };
  }
  
  export interface AuditLogMetadata extends BaseMetadata {
    browser?: string;
    os?: string;
    device_type?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    request_details?: {
      method?: string;
      path?: string;
      params?: Record<string, unknown>;
    };
  }