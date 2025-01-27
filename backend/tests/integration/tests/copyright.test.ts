import { integration } from './integrationUtility';
import { testApi } from '../../api/baseApi';

describe('Copyright Integration', () => {
    it('handles full copyright search flow', async () => {
      const { token } = await integration.createUser();
      
      // Submit search
      const searchResponse = await testApi.post('/api/copyrights/search', {
        query: 'Test Brand',
        jurisdiction: 'US'
      }, token);
      
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.results).toBeDefined();
      expect(searchResponse.body.similarityScore).toBeDefined();
    });
  
    it('detects potential infringement', async () => {
      const { token } = await integration.createUser();
      
      // Create existing copyright
      await integration.createCopyright(token, 'Original Brand');
      
      // Try similar name
      const response = await testApi.post('/api/copyrights/validate', {
        name: 'Original Brands',
        type: 'trademark'
      }, token);
      
      expect(response.status).toBe(200);
      expect(response.body.conflicts).toHaveLength(1);
      expect(response.body.riskLevel).toBe('HIGH');
    });
  });