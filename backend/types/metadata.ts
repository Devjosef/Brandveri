/**
 * Base metadata interface for all BrandVeri entities
 * Tracks common metadata across trademark and brand monitoring
 */
interface BaseMetadata {
    created_by?: string;          // User ID or system identifier that created the entity
    modified_by?: string;         // User ID or system identifier that last modified the entity
    version?: number;             // Version number for optimistic locking
    tags?: string[];             // Custom tags for categorization and filtering
}

/**
 * Metadata specific to trademark registrations and brand identities
 * Tracks detailed information about trademark usage and variations
 */
export interface TrademarkMetadata extends BaseMetadata {
    original_mark?: string;       // Original trademark submission
    variations?: string[];        // Registered variations of the trademark
    contributors?: {              // Legal representatives and trademark owners
        name: string;
        role: string;            // e.g., 'owner', 'legal_representative', 'agent'
    }[];
    industry?: string;           // Industry classification
    category?: string;           // Trademark category/class
}

/**
 * Metadata for brand similarity and infringement detection recommendations
 * Used by the AI/ML system for trademark similarity analysis
 */
export interface RecommendationMetadata extends BaseMetadata {
    confidence_score?: number;    // AI confidence score for the recommendation
    source_data?: {              // Source of the similarity match
        type: string;            // e.g., 'visual', 'phonetic', 'semantic'
        id: string;              // Reference to the source trademark
        timestamp: Date;         // When the similarity was detected
    };
    related_items?: {            // Similar or potentially infringing marks
        type: string;            // Type of relationship
        id: string;              // Reference to the related trademark
        relationship: string;    // e.g., 'similar', 'identical', 'derivative'
    }[];
    analysis_details?: {         // Details of the similarity analysis
        method: string;          // Analysis method used
        factors: string[];       // Factors considered in the analysis
        weight: number;          // Importance weight of the recommendation
    };
}

/**
 * Metadata for audit logging of trademark monitoring and enforcement actions
 * Tracks system usage and compliance activities
 */
export interface AuditLogMetadata extends BaseMetadata {
    browser?: string;            // Browser information for web access
    os?: string;                 // Operating system information
    device_type?: string;        // Device type used for access
    location?: {                 // Geographic location data
        country?: string;
        region?: string;
        city?: string;
    };
    request_details?: {          // API request details
        method?: string;         // HTTP method
        path?: string;           // API endpoint path
        params?: Record<string, unknown>; // Request parameters
    };
}