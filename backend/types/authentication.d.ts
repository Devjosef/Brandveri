// Types for authentication

export interface User {
    id: string;
    username: string;
    passwordHash: string; // Store hashed password
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthRequest {
    username: string;
    password: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface TokenPayload {
    userId: string;
    username: string;
    exp: number; // Expiration time
}

export interface RefreshTokenPayload {
    userId: string;
    exp: number; // Expiration time
}
