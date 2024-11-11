export class AuthError extends Error {
    constructor(
      public statusCode: number,
      message: string,
      public code: string
    ) {
      super(message);
      this.name = 'AuthError';
    }
  }
  
  export const AuthErrorTypes = {
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    USER_EXISTS: 'USER_EXISTS',
    MISSING_FIELDS: 'MISSING_FIELDS',
    VALIDATION_ERROR: 'VALIDATION_ERROR'
  } as const;