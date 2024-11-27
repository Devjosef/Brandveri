/**
 * BrandVeri Recommendation Engine Types
 * Handles AI-powered trademark similarity detection and brand monitoring
 */

// Similarity detection methods
export enum SimilarityMethod {
    VISUAL = 'visual',           // Image-based similarity
    PHONETIC = 'phonetic',       // Sound-based similarity
    SEMANTIC = 'semantic',       // Meaning-based similarity
    COMPOSITE = 'composite'      // Combined analysis
}

// Confidence levels for recommendations
export enum ConfidenceLevel {
    VERY_HIGH = 'very_high',    // 90-100% confidence
    HIGH = 'high',              // 70-89% confidence
    MEDIUM = 'medium',          // 50-69% confidence
    LOW = 'low'                 // Below 50% confidence
}

export interface UserPreference {
    interests: string[];         // Required field
    userId?: string;            // Optional fields
    industries?: string[];
    keywords?: string[];
    excludedTerms?: string[];
    watchlist?: string[];
    notificationThreshold?: ConfidenceLevel;
}

export interface SimilarityScore {
    score: number;              // Normalized score (0-1)
    confidenceLevel: ConfidenceLevel;
    method: SimilarityMethod;
    factors: string[];          // Factors contributing to score
}


// Base recommendation with minimal required properties
export interface BaseRecommendation {
    name: string;
    score: number;
    industry: string;
}

// Extended recommendation with optional metadata
export interface Recommendation extends BaseRecommendation {
    id?: string;
    created?: Date;
    source?: 'AI' | 'GENERATION';
    keywords?: string[];
}

// Specific interface for brand name recommendations
export interface BrandRecommendation extends Recommendation {
    type: 'BRAND_SUGGESTION';
}

// Original trademark similarity recommendation
export interface TrademarkRecommendation extends Recommendation {
    type: 'TRADEMARK_SIMILARITY';
    targetMark: string;
    similarMark: string;
    similarityScore: SimilarityScore;
    status: RecommendationStatus;
}

export enum RecommendationStatus {
    PENDING = 'pending',
    REVIEWED = 'reviewed',
    DISMISSED = 'dismissed',
    ACTIONED = 'actioned'
}

export interface RecommendationRequest {
    userId: string;
    trademarkId: string;
    context: {
        industry: string[];
        territory: string[];    // Geographic scope
        searchType: SimilarityMethod[];
        minConfidence?: number; // Minimum confidence threshold
    };
    options?: {
        includePending?: boolean;
        includeHistorical?: boolean;
        limit?: number;
        offset?: number;
    };
}

export interface RecommendationResponse {
    recommendations: Recommendation[];
    metadata: {
        totalResults: number;
        processedAt: Date;
        executionTimeMs: number;
    };
}

// Analytics and reporting
export interface RecommendationAnalytics {
    totalRecommendations: number;
    byConfidenceLevel: Record<ConfidenceLevel, number>;
    byType: Record<RecommendationType, number>;
    averageConfidence: number;
    actionRate: number;         // Percentage of actioned recommendations
}
