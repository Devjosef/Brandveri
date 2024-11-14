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
    userId: string;
    industries: string[];        // Industry classifications
    keywords: string[];         // Relevant keywords
    excludedTerms?: string[];   // Terms to exclude
    watchlist?: string[];       // Specific terms to monitor
    notificationThreshold?: ConfidenceLevel;
}

export interface SimilarityScore {
    score: number;              // Normalized score (0-1)
    confidenceLevel: ConfidenceLevel;
    method: SimilarityMethod;
    factors: string[];          // Factors contributing to score
}

export interface Recommendation {
    id: string;
    type: RecommendationType;
    targetMark: string;         // The trademark being analyzed
    similarMark: string;        // The similar trademark found
    score: SimilarityScore;
    priority: 'high' | 'medium' | 'low';
    created: Date;
    status: RecommendationStatus;
    metadata?: Record<string, unknown>;
}

export enum RecommendationType {
    POTENTIAL_INFRINGEMENT = 'potential_infringement',
    SIMILAR_MARK = 'similar_mark',
    WATCH_LIST_MATCH = 'watch_list_match',
    INDUSTRY_ALERT = 'industry_alert'
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
        nextUpdate?: Date;
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
