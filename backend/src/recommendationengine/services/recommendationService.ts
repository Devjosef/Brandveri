import { CacheError, cacheService } from '../../utils/cache';
import { recommendationSchema, getBrandRecommendations, calculateComplexityScore } from '../utils/helperFunctions';
import { loggers } from '../../../observability/contextLoggers';
import { RecommendationRequest, RecommendationResponse, Recommendation, UserPreference} from '../../../types/recommendationEngine';
import { recommendationDAL, RecommendationError } from '../data/recommendationDAL';
import { Histogram, Counter } from 'prom-client';
import { sensitiveOpsLimiter } from '../../../middleware/ratelimiter';
import { invariant } from '../utils/invariant';

const logger = loggers.recommendation;

class RecommendationService {
    private readonly aiMetrics = {
        quality: new Histogram({
            name: 'recommendation_quality_score',
            help: 'Quality score of recommendations',
            buckets: [0.1, 0.3, 0.5, 0.7, 0.9]
        }),
        retries: new Counter({
            name: 'ai_service_retries_total',
            help: 'Number of AI service retry attempts',
            labelNames: ['status']
        })
    };

    private readonly aiRateLimiter = sensitiveOpsLimiter;

    private async getAISuggestions(industry: string, keywords: string[]): Promise<string[]> {
        try {
            await this.aiRateLimiter.consume('ai-service');
            return this.retryOperation(async () => {
                const prompt = `Generate brand names for ${industry} industry with keywords: ${keywords.join(', ')}`;
                return getBrandRecommendations(prompt);
            });
        } catch (err) {
            const error = err instanceof Error ? err : new RecommendationError('Unknown error occurred');
            if (error.name === 'RateLimitExceeded') {
                logger.warn('AI service rate limit exceeded');
                throw new RecommendationError('Rate limit exceeded for AI service');
            }
            throw error;
        }
    }

    private async retryOperation<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await operation();
                this.aiMetrics.retries.inc({ status: 'success' });
                return result;
            } catch (err) {
                const error = err instanceof Error ? err : new RecommendationError('Unknown error occurred');
                lastError = error;
                this.aiMetrics.retries.inc({ status: 'failure' });
                
                if (attempt === maxAttempts) break;
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        
        throw lastError || new RecommendationError('Operation failed after retries');
    }

    public async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
        const startTime = Date.now();
        try {
            const validatedRequest = recommendationSchema.parse(request);
            const { userId, keywords = [], industry = '' } = validatedRequest;

            const cacheKey = `recommendations:${userId ?? 'default'}:${industry}`;
            logger.info({ cacheKey, industry, keywords }, 'Attempting to fetch recommendations');

            // Checks the cache for recommendations
           let recommendations;
        try {
            recommendations = await this.getCachedRecommendations(cacheKey);
            if (recommendations) {
                return {
                    recommendations,
                    metadata: {
                        totalResults: recommendations.length,
                        processedAt: new Date(),
                        executionTimeMs: Date.now() - startTime
                    }
                };
            }
        } catch (error) {
            if (error instanceof CacheError) {
                logger.warn({ error }, 'Proceeding without cache due to cache service issues');
                // Continue execution without cache
            } else {
                throw error;
            }
        }

            // Fetches user preferences and generate brand concurrently to reduce response time.
            const [userPreferences, brandNames] = await Promise.all([
                this.getUserPreferences(userId || ''),
                recommendationDAL.generateBrandNames(),
            ]);

            // Process base recommendations
            const baseRecommendations = brandNames.map(name => ({
                name,
                score: calculateComplexityScore(keywords),
                industry,
            }));

            recommendations = userPreferences
                ? this.filterRecommendations(userPreferences, baseRecommendations)
                : baseRecommendations;

            // Handle AI suggestions based on complexity
            if (keywords.length > 0) {
                const complexityScore = calculateComplexityScore(keywords);
                logger.info({ complexityScore, keywords }, 'Analyzing complexity for AI suggestions');

                if (complexityScore <= 10) {
                    try {
                        const aiSuggestions = await this.getAISuggestions(industry, keywords);
                        const aiRecommendations = aiSuggestions.map(name => ({
                            name,
                            score: complexityScore,
                            industry,
                        }));
                        
                        if (userPreferences) {
                            this.validateFilterInput(userPreferences, aiRecommendations);
                            recommendations.push(...aiRecommendations);
                            this.measureRecommendationQuality(recommendations);
                        } else {
                            recommendations.push(...aiRecommendations);
                        }
                    } catch (aiError) {
                        logger.warn({ aiError }, 'Failed to fetch AI suggestions after retries');
                    }
                } else {
                    logger.warn({ complexityScore }, 'Skipping AI suggestions due to high complexity');
                }
            }

            // Cache results
            try {
                await this.cacheRecommendations(cacheKey, recommendations);
            } catch (error) {
                if (error instanceof CacheError) {
                    logger.warn({ error }, 'Unable to cache results - continuing without caching');
                    // Continue execution without caching
                }
            }
    
            return {
                recommendations,
                metadata: {
                    totalResults: recommendations.length,
                    processedAt: new Date(),
                    executionTimeMs: Date.now() - startTime
                }
            };
        } catch (error) {
            logger.error({ error }, 'Failed to generate recommendations');
            throw new Error('Failed to generate recommendations. Please try again later.');
        }
    }

    private async getCachedRecommendations(cacheKey: string): Promise<Recommendation[] | null> {
        try {
            const cachedData = await cacheService.get<Recommendation[]>(cacheKey, { 
                service: 'recommendation' 
            });
            if (cachedData) {
                logger.info({ cacheKey }, 'Cache hit');
                return cachedData;
            }
            logger.info({ cacheKey }, 'Cache miss');
            return null;
        } catch (error) {
            logger.warn({ cacheKey, error }, 'Cache retrieval failed - possible Redis connection issues');
            throw new CacheError('CACHE_GET_ERROR', 'Failed to retrieve recommendations from cache', error);
        }
    }

    private async cacheRecommendations(cacheKey: string, recommendations: Recommendation[]): Promise<void> {
        try {
            await cacheService.set(cacheKey, recommendations, { 
                ttl: 300, 
                service: 'recommendation' 
            });
            logger.info({ cacheKey }, 'Cached recommendations successfully');
        } catch (error) {
            logger.warn({ cacheKey, error }, 'Cache storage failed - possible Redis connection issues');
            throw new CacheError('CACHE_SET_ERROR', 'Failed to store recommendations in cache', error);
        }
    }

    public async getUserPreferences(userId: string): Promise<UserPreference | null> {
        logger.info({ userId }, 'Fetching user preferences');
        return userId ? {
            interests: ['technology', 'finance'],
            userId,
            industries: [],
            keywords: []
        } : null;
    }

    private filterRecommendations(
        userPreferences: UserPreference,
        recommendations: Recommendation[]
    ): Recommendation[] {
        logger.info({
            preferences: userPreferences.interests,
            totalRecommendations: recommendations.length,
        }, 'Filtering recommendations');
        
        return recommendations.filter(rec =>
            userPreferences.interests.some(interest =>
                rec.name.toLowerCase().includes(interest.toLowerCase())
            )
        );
    }

    

    private validateFilterInput(userPreferences: UserPreference, recommendations: Recommendation[]): void {
        invariant(
            Array.isArray(userPreferences.interests) && userPreferences.interests.length > 0,
            'User preferences must contain at least one interest'
        );
        
        invariant(
            Array.isArray(recommendations) && recommendations.length > 0,
            'Recommendations array cannot be empty'
        );
        
        invariant(
            recommendations.every(rec => 
                typeof rec.name === 'string' && 
                typeof rec.score === 'number' && 
                typeof rec.industry === 'string'
            ),
            'Invalid recommendation format'
        );
    }

    private measureRecommendationQuality(recommendations: Recommendation[]): void {
        const qualityScore = recommendations.reduce((acc, rec) => {
            const relevanceScore = rec.score / 100;
            const diversityScore = this.calculateDiversityScore(rec, recommendations);
            return acc + (relevanceScore * 0.7 + diversityScore * 0.3);
        }, 0) / recommendations.length;

        this.aiMetrics.quality.observe(qualityScore);
    }

    private calculateDiversityScore(recommendation: Recommendation, allRecs: Recommendation[]): number {
        const similarNames = allRecs.filter(r => 
            r !== recommendation && 
            this.calculateStringSimilarity(r.name, recommendation.name) > 0.7
        ).length;

        return 1 - (similarNames / allRecs.length);
    }

    private calculateStringSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const costs = new Array<number>();
        for (let i = 0; i <= shorter.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= longer.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (shorter[i - 1] !== longer[j - 1]) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[longer.length] = lastValue;
        }
        return (longer.length - costs[longer.length]) / longer.length;
    }
}

export const recommendationService = new RecommendationService();

