import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { Session } from 'express-session';

// Types for authentication

export interface User {
    id: number; 
    username: string;
    passwordHash: string; // Store hashed password
    email: string;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;           // Track last login
    failedLoginAttempts?: number; // Security tracking
    accountLocked?: boolean;    // Account security status
    emailVerified: boolean;     // Email verification status
    role: UserRole;            // User role enum
    status: UserStatus;        // Account status enum
    tokenVersion: number;      // For token invalidation
}

export interface AuthRequest {
    username: string;
    password: string;
    deviceId?: string;         // For device tracking
    clientInfo?: {            // Client information
        userAgent: string;
        ipAddress: string;
        deviceType: string;
    };
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface TokenPayload {
    id: number;
    username: string;
    role: UserRole;           // Make required
    tokenVersion: number;     // Make required
    exp: number;             // Make required
    iat: number;             // Issued at
    deviceId?: string;       // Device tracking
    permissions?: string[];  // Granular permissions
}

export interface AuthenticatedRequest extends Request {
    user: TokenPayload;
    session?: Session;
}

export type AuthenticatedRequestHandler<
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
> = (
    req: AuthenticatedRequest,
    res: Response<ResBody>,
    next: NextFunction
) => Promise<void> | void;

export interface RefreshTokenPayload {
    id: number; 
    exp: number; // Expiration time
}

export interface TokenResponse {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
}

export type AuthAction = 
    | 'login' 
    | 'logout' 
    | 'token_refresh' 
    | 'token_revoked'
    | 'invalid_token'
    | 'authentication_failed';

export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    MODERATOR = 'moderator'
}

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    PENDING_VERIFICATION = 'pending_verification'
}

export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message: string;
    statusCode: number;
}

export interface RateLimitInfo {
    limit: number;
    current: number;
    remaining: number;
    resetTime: Date;
}

export enum AuthErrorCode {
    INVALID_CREDENTIALS = 'invalid_credentials',
    ACCOUNT_LOCKED = 'account_locked',
    TOKEN_EXPIRED = 'token_expired',
    TOKEN_INVALID = 'token_invalid',
    INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded'
}

export interface AuthError extends Error {
    code: AuthErrorCode;
    statusCode: number;
    details?: Record<string, unknown>;
}

export interface AuthSession extends Session {
    userId: number;
    deviceId?: string;
    lastActivity: Date;
    ipAddress: string;
    userAgent: string;
}

export interface SessionConfig {
    maxAge: number;
    secure: boolean;
    sameSite: boolean | 'lax' | 'strict' | 'none';
    domain?: string;
    rolling: boolean;
}
