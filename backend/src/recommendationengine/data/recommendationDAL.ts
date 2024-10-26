import { Recommendation, RecommendationType } from '../../../types/recommendationEngine';
import { setCache, getCache } from '../../utils/cache';

class RecommendationDAL {
    private static recommendations: Recommendation[] = [
        { id: 1, type: RecommendationType.BRAND, name: 'EcoWave', description: 'A sustainable brand for eco-friendly products.' },
        { id: 2, type: RecommendationType.BRAND, name: 'TechNova', description: 'Innovative technology solutions for modern businesses.' },
        { id: 3, type: RecommendationType.BRAND, name: 'HealthNest', description: 'Your trusted partner in health and wellness.' },
        { id: 4, type: RecommendationType.BRAND, name: 'UrbanBites', description: 'Delicious and convenient urban dining experiences.' },
        { id: 5, type: RecommendationType.BRAND, name: 'StyleSphere', description: 'Fashion-forward clothing for the modern individual.' },
        // Additional predefined recommendations
        { id: 6, type: RecommendationType.BRAND, name: 'GreenLeaf', description: 'Eco-friendly solutions for a sustainable future.' },
        { id: 7, type: RecommendationType.BRAND, name: 'ByteCraft', description: 'Cutting-edge software development and IT services.' },
        { id: 8, type: RecommendationType.BRAND, name: 'FitPulse', description: 'Innovative fitness and wellness products.' },
        { id: 9, type: RecommendationType.BRAND, name: 'GourmetGrove', description: 'Exquisite gourmet food and culinary experiences.' },
        { id: 10, type: RecommendationType.BRAND, name: 'ArtisanAlley', description: 'Handcrafted goods and artisanal products.' },
    ];

    public async getRecommendations(): Promise<Recommendation[]> {
        // Simulate fetching from a database
        return RecommendationDAL.recommendations;
    }

    public async generateBrandNames(): Promise<string[]> {
        const cacheKey = 'generatedBrandNames';
        const cachedNames = await getCache(cacheKey);

        if (cachedNames) {
            return cachedNames;
        }

        const vowels = ['a', 'e', 'i', 'o', 'u'];
        const consonants = 'bcdfghjklmnpqrstvwxyz'.split('');
        const names: Set<string> = new Set();


        while (names.size < 11000000) { // Generate until we have 11 million unique names
            let name = '';
            const length = Math.floor(Math.random() * 4) + 4; // Length between 4 and 7

            for (let j = 0; j < length; j++) {
                if (j % 2 === 0) {
                    name += consonants[Math.floor(Math.random() * consonants.length)];
                } else {
                    name += vowels[Math.floor(Math.random() * vowels.length)];
                }
            }

            // Ensure the name is unique
            names.add(name.charAt(0).toUpperCase() + name.slice(1)); // Capitalize the first letter
        }

        const nameArray = Array.from(names);
        await setCache(cacheKey, nameArray, 86400); // Cache for 24 hours

        return nameArray;
    }
}

export const recommendationDAL = new RecommendationDAL();
