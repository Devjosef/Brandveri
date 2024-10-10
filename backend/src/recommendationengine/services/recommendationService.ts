import { Recommendation, RecommendationRequest, RecommendationResponse, UserPreference } from '../types/recommendationEngine';
import { getUserPreferences } from '../utils/helperFunctions';

class RecommendationService {
    private recommendations: Recommendation[] = [
        { id: 1, type: 'Brand Name', name: 'BrandA', description: 'A unique brand name.' },
        { id: 2, type: 'Brand Name', name: 'BrandB', description: 'Another unique brand name.' },
        // Add more predefined recommendations for testing
    ];

    public async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
        try {
            const userPreferences: UserPreference | null = await getUserPreferences(request.userId);

            if (!userPreferences) {
                throw new Error('User preferences not found.');
            }

            const filteredRecommendations = this.filterRecommendations(userPreferences);

            return { recommendations: filteredRecommendations };
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            throw new Error('Failed to fetch recommendations. Please try again later.');
        }
    }

    private filterRecommendations(userPreferences: UserPreference): Recommendation[] {
        return this.recommendations.filter(rec =>
            userPreferences.interests.some(interest => rec.name.toLowerCase().includes(interest.toLowerCase()))
        );
    }
}

// Export the service
export const recommendationService = new RecommendationService();