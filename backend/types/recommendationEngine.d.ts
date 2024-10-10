// Represents user-specific preferences or interests
export interface UserPreference {
    userId: string;
    interests: string[]; // Could be renamed to 'keywords' if needed
}

// Defines a single recommendation result
export interface Recommendation {
    id: number;
    type: RecommendationType; // Enum for specific recommendation types
    name: string;
    description?: string; // Optional description for more detailed recommendations
}

// Enum for defining fixed types of recommendations
export enum RecommendationType {
    BRAND = 'brand',
    PRODUCT = 'product',
    SERVICE = 'service',
    OTHER = 'other',
}

// Represents the request for recommendations, containing user ID and preferences
export interface RecommendationRequest {
    userId: string;
    preferences: string[]; // More detailed preferences in future iterations
}

// The response format for the recommendation engine, returning an array of recommendations
export interface RecommendationResponse {
    recommendations: Recommendation[]; // Array of recommendation results
}
