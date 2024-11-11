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
    id: number;
    username: string;
    role?: string;
    tokenVersion?: number;
    exp?: number;
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
