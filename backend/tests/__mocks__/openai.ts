import type { OpenAIMock, OpenAICompletion, OpenAIEmbedding, OpenAIModeration } from './types/openaiTypes';

const defaultCompletion: OpenAICompletion = {
  id: 'cmpl-123',
  object: 'text_completion',
  created: Date.now(),
  model: 'gpt-3.5-turbo',
  choices: [{
    text: 'Mock completion response',
    index: 0,
    logprobs: null,
    finish_reason: 'stop'
  }],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30
  }
};

const defaultEmbedding: OpenAIEmbedding = {
  object: 'list',
  data: [{
    object: 'embedding',
    embedding: [0.1, 0.2, 0.3], // Mocks the embedding vector
    index: 0
  }],
  model: 'text-davinci-003',
  usage: {
    prompt_tokens: 8,
    total_tokens: 8
  }
};

const defaultModeration: OpenAIModeration = {
  id: 'modr-123',
  model: 'text-moderation-latest',
  results: [{
    flagged: false,
    categories: {
      hate: false,
      'hate/threatening': false,
      'self-harm': false,
      sexual: false,
      'sexual/minors': false,
      violence: false,
      'violence/graphic': false
    },
    category_scores: {
      hate: 0.01,
      'hate/threatening': 0.01,
      'self-harm': 0.01,
      sexual: 0.01,
      'sexual/minors': 0.01,
      violence: 0.01,
      'violence/graphic': 0.01
    }
  }]
};

const errors = {
  rateLimit: {
    error: {
      message: 'Rate limit exceeded',
      type: 'rate_limit_error',
      code: 'rate_limit_exceeded'
    }
  },
  invalidRequest: {
    error: {
      message: 'Invalid request',
      type: 'invalid_request_error',
      code: 'invalid_request'
    }
  },
  apiError: {
    error: {
      message: 'OpenAI API error',
      type: 'api_error',
      code: 'server_error'
    }
  }
} as const;

export const createOpenAIMock = (): OpenAIMock => {
  const mock: OpenAIMock = {
    createCompletion: jest.fn().mockResolvedValue(defaultCompletion),
    createEmbedding: jest.fn().mockResolvedValue(defaultEmbedding),
    createModeration: jest.fn().mockResolvedValue(defaultModeration),
    clear: () => {
      mock.createCompletion.mockClear();
      mock.createEmbedding.mockClear();
      mock.createModeration.mockClear();
    },
    errors
  };

  return mock;
};

export const openAIMock = createOpenAIMock();