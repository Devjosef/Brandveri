import { testApi } from '../baseApi';
import { mocks } from '../../__mocks__';

const { euipo: euipoMock } = mocks;

describe('EUIPO API Integration', () => {
  beforeEach(() => {
    euipoMock.search.mockClear();
    euipoMock.verify.mockClear();
  });

  it('should search EU trademarks', async () => {
    const searchQuery = { term: 'ADIDAS' };
    euipoMock.search.mockResolvedValueOnce({
      results: [{ applicationNumber: 'EU123456', trademark: 'ADIDAS' }]
    });

    const response = await testApi.post('/api/euipo/search', searchQuery);
    
    expect(response.status).toBe(200);
    expect(euipoMock.search).toHaveBeenCalledWith(searchQuery);
  });
});