// Token Types
export type TokenType = 'access' | 'refresh';

export interface DecodedToken {
    sub: string;  // User ID
    email: string;
    roles: string[];
    exp: number;  // Expiration timestamp
    iat: number;  // Issued at timestamp
}

export interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    token_type: 'Bearer';
    expires_in: number;
}

// Error types
export interface AuthError {
    code: string;
    message: string;
    status: number;
}

// Auth Service interface 
export interface AuthServiceMock {
    verifyToken: jest.Mock<Promise<DecodedToken>>;
    generateToken: jest.Mock<Promise<TokenResponse>>;
    refreshToken: jest.Mock<Promise<TokenResponse>>;
    revokeToken: jest.Mock<Promise<void>>;
    validateRequest: jest.Mock<Promise<boolean>>;
  }