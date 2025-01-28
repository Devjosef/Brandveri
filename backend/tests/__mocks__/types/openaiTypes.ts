export interface OpenAICompletion {
    id: string;
    object: 'text_completion';
    created: number;
    model: OpenAIModel;
    choices: Array<{
      text: string;
      index: number;
      logprobs: null;
      finish_reason: 'stop' | 'length' | 'content_filter';
    }>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }
  
  export interface OpenAIEmbedding {
    object: 'list';
    data: Array<{
      object: 'embedding';
      embedding: number[];
      index: number;
    }>;
    model: OpenAIModel;
    usage: {
      prompt_tokens: number;
      total_tokens: number;
    };
  }
  
  export interface OpenAIModeration {
    id: string;
    model: 'text-moderation-latest';
    results: Array<{
      flagged: boolean;
      categories: {
        hate: boolean;
        'hate/threatening': boolean;
        'self-harm': boolean;
        sexual: boolean;
        'sexual/minors': boolean;
        violence: boolean;
        'violence/graphic': boolean;
      };
      category_scores: {
        hate: number;
        'hate/threatening': number;
        'self-harm': number;
        sexual: number;
        'sexual/minors': number;
        violence: number;
        'violence/graphic': number;
      };
    }>;
  }
  
  type OpenAIErrorType = 'invalid_request_error' | 'api_error' | 'rate_limit_error';
  type OpenAIErrorCode = 'rate_limit_exceeded' | 'invalid_request' | 'server_error';
  
  export interface OpenAIError {
    error: {
      type: OpenAIErrorType;
      code: OpenAIErrorCode;
      message: string;
      param?: string;
    };
  }
  
  export interface OpenAIMock {
    createCompletion: jest.Mock<Promise<OpenAICompletion>>;
    createEmbedding: jest.Mock<Promise<OpenAIEmbedding>>;
    createModeration: jest.Mock<Promise<OpenAIModeration>>;
    clear: () => void;
    errors: {
      rateLimit: OpenAIError;
      invalidRequest: OpenAIError;
      apiError: OpenAIError;
    };
  }

  export type OpenAIModel = 'gpt-4' | 'gpt-3.5-turbo' | 'text-davinci-003';