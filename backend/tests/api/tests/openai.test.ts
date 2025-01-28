import { testApi } from '../baseApi';
import { mocks } from '../../__mocks__';

const { openai: openAIMock } = mocks;

describe('OpenAI API Integration', () => {
  beforeEach(() => {
    openAIMock.clear();
  });

  it('should analyze trademark similarity', async () => {
    const analysisRequest = { mark1: 'NIKE', mark2: 'NYKE' };
    openAIMock.createCompletion.mockResolvedValueOnce({
      id: 'test-id',
      object: 'text_completion', 
      created: Date.now(),
      model: 'text-davinci-003',
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      },
      choices: [{
          text: 'High similarity',
          finish_reason: 'stop',
          index: 0,
          logprobs: null
      }]
    });

    const response = await testApi.post('/api/ai/analyze', analysisRequest);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('similarity');
  });
});