import { Recommendation, RecommendationRequest, RecommendationResponse, RecommendationType, UserPreference } from '../../../types/recommendationEngine';
import { getCache, setCache } from '../../utils/cache'; // Import cache functions


class RecommendationService {
    // Move this into a data access layer in the future
    private static recommendations: Recommendation[] = [
        { id: 1, type: RecommendationType.BRAND, name: 'BrandA', description: 'A unique brand name.' },
        { id: 2, type: RecommendationType.BRAND, name: 'BrandB', description: 'Another unique brand name.' },
        // Add more predefined recommendations for testing
    ];

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
                const defaultRecommendations = this.getDefaultRecommendations();
                await setCache(cacheKey, defaultRecommendations); // Cache default recommendations
                return { recommendations: defaultRecommendations };
            }

            const filteredRecommendations = this.filterRecommendations(userPreferences);

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
     * @returns A filtered list of recommendations that match the user's interests.
     */
    private filterRecommendations(userPreferences: UserPreference): Recommendation[] {
        // A more efficient way could involve scoring based on how well recommendations match preferences
        return RecommendationService.recommendations.filter(rec =>
            userPreferences.interests.some((interest: string) => rec.name.toLowerCase().includes(interest.toLowerCase()))
        );
    }

    /**
     * Provides a default list of recommendations when no user preferences are found.
     * @returns A default list of recommendations.
     */
    private getDefaultRecommendations(): Recommendation[] {
        return RecommendationService.recommendations.slice(0, 3); // For example, returning the first 3 as defaults
    }
}

// Export the service instance
export const recommendationService = new RecommendationService();
