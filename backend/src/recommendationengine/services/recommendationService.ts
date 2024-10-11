import { Recommendation, RecommendationRequest, RecommendationResponse, UserPreference } from '../types/recommendationEngine';
import { getUserPreferences } from '../../../types/UserPreference';

// Ideally, you might fetch these from a database or API instead of hardcoding.
class RecommendationService {
    // Move this into a data access layer in the future
    private static recommendations: Recommendation[] = [
        { id: 1, type: 'Brand Name', name: 'BrandA', description: 'A unique brand name.' },
        { id: 2, type: 'Brand Name', name: 'BrandB', description: 'Another unique brand name.' },
        // Add more predefined recommendations for testing
    ];

    /**
     * Retrieves recommendations based on user preferences.
     * @param request - The recommendation request object from the client.
     * @returns A recommendation response with filtered suggestions.
     */
    public async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
        try {
            // Fetch user preferences
            const userPreferences = await getUserPreferences(request.userId);

            // If no preferences are found, return a default response instead of throwing an error
            if (!userPreferences) {
                console.warn(`User preferences not found for userId: ${request.userId}`);
                return { recommendations: this.getDefaultRecommendations() };
            }

            // Filter recommendations based on user preferences
            const filteredRecommendations = this.filterRecommendations(userPreferences);

            // Return the filtered recommendations in the response format
            return { recommendations: filteredRecommendations };
        } catch (error) {
            console.error('Error in RecommendationService.getRecommendations:', error);
            throw new Error('Failed to fetch recommendations. Please try again later.');
        }
    }

    /**
     * Filters recommendations based on user preferences.
     * @param userPreferences - The user's preferences containing interests.
     * @returns A filtered list of recommendations that match the user's interests.
     */
    private filterRecommendations(userPreferences: UserPreference): Recommendation[] {
        // A more efficient way could involve scoring based on how well recommendations match preferences
        return RecommendationService.recommendations.filter(rec =>
            userPreferences.interests.some(interest => rec.name.toLowerCase().includes(interest.toLowerCase()))
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

