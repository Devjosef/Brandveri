import { z } from 'zod';
import { escape } from 'validator';
import { loggers } from '../../../observability/contextLoggers';
import axios from 'axios';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { invariant } from '../utils/invariant'
import { SimilarityMethod } from '../../../types/recommendationEngine';

const logger = loggers.recommendation;

const openAIBreaker = new CircuitBreaker('openai', {
  failureThreshold: 3,
  resetTimeout: 30000
});

// Provides type-safe validation with proper error messages
export const recommendationSchema = z.object({
  userId: z.string(),
  trademarkId: z.string(),
  keywords: z.array(z.string()).optional(),
  industry: z.string().optional(),
  context: z.object({
    industry: z.array(z.string())
      .min(1)
      .transform(industries => industries.map(sanitizeInput)),
    territory: z.array(z.string())
      .min(1)
      .transform(territories => territories.map(sanitizeInput)),
    searchType: z.array(z.nativeEnum(SimilarityMethod)),
    minConfidence: z.number().min(0).max(1).optional()
  }),
  options: z.object({
    includePending: z.boolean().optional(),
    includeHistorical: z.boolean().optional(),
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional()
  }).optional()
});

// Reuse of existing sanitization logic
export const sanitizeInput = (input: string): string => {
  return escape(input.trim());
};

// Calculates rate limit based on request complexity
export const calculateComplexityScore = (keywords: string[]): number => {
  return keywords.length * 2 + (keywords.join('').length / 10);
};

// Structured error handling for OpenAI API calls
export const getBrandRecommendations = async (prompt: string): Promise<string[]> => {
  invariant(prompt.length > 0 && prompt.length < 1000, 'Prompt must be between 1 and 1000 characters');
  
  return openAIBreaker.execute(async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/completions',
        {
          model: 'text-davinci-003',
          prompt,
          max_tokens: 100,
          n: 5,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      if (!response.data?.choices) {
        logger.error({ response }, 'Unexpected OpenAI API response format');
        throw new Error('Unexpected response format from OpenAI API.');
      }

      return response.data.choices.map((choice: { text: string }) => choice.text.trim());
    } catch (error) {
      logger.error({ error }, 'Failed to fetch brand recommendations');
      throw new Error('Failed to fetch brand name recommendations. Please try again later.');
    }
  });
};