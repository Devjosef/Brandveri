import { Recommendation, RecommendationRequest, RecommendationResponse, UserPreference } from '../../../types/recommendationEngine';
import { getCache, setCache } from '../../utils/cache';
import { recommendationDAL } from '../data/recommendationDAL'

class RecommendationService {
    /**
     * Retrieves recommendations based on user preferences.
     * @param request - The recommendation request object from the client.
     * @returns A recommendation response with filtered suggestions.
     */
    public async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
        try {
            const cacheKey = `recommendations:${request.userId}`;

            // Check cache first
            const cachedData = await getCache(cacheKey);
            if (cachedData) {
                return { recommendations: cachedData };
            }

            const userPreferences: UserPreference | null = await this.getUserPreferences(request.userId);

            if (!userPreferences) {
                console.warn(`User preferences not found for userId: ${request.userId}`);
                const defaultRecommendations = await recommendationDAL.getRecommendations();
                await setCache(cacheKey, defaultRecommendations); // Cache default recommendations
                return { recommendations: defaultRecommendations };
            }

            const allRecommendations = await recommendationDAL.getRecommendations();
            const filteredRecommendations = this.filterRecommendations(userPreferences, allRecommendations);

            // Cache the filtered recommendations
            await setCache(cacheKey, filteredRecommendations);

            return { recommendations: filteredRecommendations };
        } catch (error) {
            console.error('Error in RecommendationService.getRecommendations:', error);
            throw new Error('Failed to fetch recommendations. Please try again later.');
        }
    }

    getUserPreferences(_userId: string): UserPreference | PromiseLike<UserPreference | null> | null {
        throw new Error('Method not implemented.');
    }

    /**
     * Filters recommendations based on user preferences.
     * @param userPreferences - The user's preferences containing interests.
     * @param recommendations - The list of all recommendations.
     * @returns A filtered list of recommendations that match the user's interests.
     */
    private filterRecommendations(userPreferences: UserPreference, recommendations: Recommendation[]): Recommendation[] {
        return recommendations.filter(rec =>
            userPreferences.interests.some((interest: string) => rec.name.toLowerCase().includes(interest.toLowerCase()))
        );
    }
}

// Export the service instance
export const recommendationService = new RecommendationService();
