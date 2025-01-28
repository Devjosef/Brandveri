import { testApi } from '../baseApi';
import { mocks } from '../../__mocks__';

const { uspto: usptoMock } = mocks;

describe('USPTO API Integration', () => {
  beforeEach(() => {
    usptoMock.search.mockClear();
    usptoMock.verify.mockClear();
  });

  it('should search USPTO trademarks', async () => {
    const searchQuery = { term: 'NIKE' };
    usptoMock.search.mockResolvedValueOnce({
      results: [{ serialNumber: '88123456', wordMark: 'NIKE' }]
    });

    const response = await testApi.post('/api/uspto/search', searchQuery);
    
    expect(response.status).toBe(200);
    expect(usptoMock.search).toHaveBeenCalledWith(searchQuery);
  });

  it('should handle USPTO rate limits', async () => {
    usptoMock.search.mockRejectedValueOnce({
      code: 'RATE_LIMIT_EXCEEDED'
    });

    const response = await testApi.post('/api/uspto/search', { term: 'NIKE' });
    
    expect(response.status).toBe(429);
  });
});