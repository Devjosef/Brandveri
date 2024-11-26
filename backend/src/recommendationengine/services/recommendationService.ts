import { Recommendation, RecommendationRequest, RecommendationResponse, UserPreference } from '../../../types/recommendationEngine';
import { cacheService } from '../../utils/cache';
import { recommendationDAL } from '../data/recommendationDAL';
import { 
    recommendationSchema, 
    getBrandRecommendations, 
    calculateComplexityScore, 
    sanitizeInput 
} from '../utils/helperFunctions';
import { loggers } from '../../../observability/contextLoggers';

const logger = loggers.recommendation;

class RecommendationService {
    public async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
        try {
            const validatedRequest = recommendationSchema.parse(request);
            const { userId, keywords, industry } = validatedRequest;

            const cacheKey = `recommendations:${userId ?? 'default'}:${industry}`;
            logger.info({ cacheKey, industry }, 'Fetching recommendations');

            const cachedData = await getCache(cacheKey);
            if (cachedData) {
                logger.info({ cacheKey }, 'Serving recommendations from cache');
                return { recommendations: cachedData };
            }

            const userPreferences = await this.getUserPreferences(userId || '');
            const brandNames = await recommendationDAL.generateBrandNames();

            const baseRecommendations = brandNames.map(name => ({
                name,
                score: calculateComplexityScore(keywords),
                industry
            }));

            const recommendations = userPreferences
                ? this.filterRecommendations(userPreferences, baseRecommendations)
                : baseRecommendations;

            if (keywords.length > 0) {
                const complexityScore = calculateComplexityScore(keywords);
                logger.info({ complexityScore, keywords }, 'Fetching AI suggestions');

                if (complexityScore <= 10) {
                    const aiSuggestions = await getBrandRecommendations(
                        `Generate brand names for ${industry} industry with keywords: ${keywords.join(', ')}`
                    );

                    recommendations.push(...aiSuggestions.map(name => ({
                        name,
                        score: complexityScore,
                        industry
                    })));
                } else {
                    logger.warn({ complexityScore }, 'Skipping AI suggestions due to high complexity');
                }
            }

            await setCache(cacheKey, recommendations);
            return { recommendations };

        } catch (error) {
            logger.error({ error }, 'Failed to generate recommendations');
            throw new Error('Failed to generate recommendations. Please try again later.');
        }
    }

    public async getUserPreferences(userId: string): Promise<UserPreference | null> {
        logger.info({ userId }, 'Fetching user preferences');
        return userId ? { interests: ['technology', 'finance'] } : null;
    }

    private filterRecommendations(
        userPreferences: UserPreference, 
        recommendations: Recommendation[]
    ): Recommendation[] {
        logger.info({ 
            preferences: userPreferences.interests,
            totalRecommendations: recommendations.length 
        }, 'Filtering recommendations');

        return recommendations.filter(rec =>
            userPreferences.interests.some(interest => 
                rec.name.toLowerCase().includes(interest.toLowerCase())
            )
        );
    }
}

export const recommendationService = new RecommendationService();
