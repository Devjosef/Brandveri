import { integration } from './integrationUtility';
import { testApi } from '../../api/baseApi';

describe('Recommendation Integration', () => {
    it('provides trademark recommendations', async () => {
      const { token } = await integration.createUser();
      
      // Get recommendations.
      const response = await testApi.post('/api/recommendations', {
        industry: 'Technology',
        keywords: ['software', 'cloud'],
        targetMarket: 'B2B'
      }, token);
      
      expect(response.status).toBe(200);
      expect(response.body.recommendations).toHaveLength(3);
      expect(response.body.recommendations[0]).toHaveProperty('confidence');
    });
  
    it('handles conflicting recommendations', async () => {
      const { token } = await integration.createUser();
      
      // Create existing trademark.
      await integration.createTrademark(token, 'CloudTech');
      
      // Get recommendations with conflict.
      const response = await testApi.post('/api/recommendations', {
        industry: 'Technology',
        keywords: ['cloud', 'tech'],
        targetMarket: 'B2B'
      }, token);
      
      expect(response.body.recommendations).toEqual(
        expect.not.arrayContaining(['CloudTech'])
      );
    });
  
    it('adapts to market trends', async () => {
      const { token } = await integration.createUser();
      
      // Set market trend data.
      await integration.setMarketTrend('Technology', {
        trending: ['AI', 'ML'],
        declining: ['Web2']
      });
      
      const response = await testApi.post('/api/recommendations', {
        industry: 'Technology',
        keywords: ['software'],
        targetMarket: 'B2B'
      }, token);
      
      // Should prefer trending keywords.
      expect(response.body.recommendations[0].name).toMatch(/AI|ML/);
    });
  });