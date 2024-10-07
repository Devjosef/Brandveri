// types for the recommendationEngine

export interface UserPreference {
    userId: string;
    interests: string[];
}

export interface Recommendation {
    id: number;
    type: string;
    name: string;
    description?: string;
}

export interface RecommendationRequest {
    userId: string;
    preferences: string[];
}

export interface RecommendationResponse {
    recommendations: Recommendation[];
}
