import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { AuthError, AuthErrorTypes } from './AuthError';

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;
const REFRESH_SECRET_KEY = process.env.JWT_REFRESH_TOKEN;

if (!SECRET_KEY || !REFRESH_SECRET_KEY) {
    throw new Error('JWT_SECRET or JWT_REFRESH_TOKEN environment variable is not set');
}

export interface TokenPayload {
    id: number;
    username: string;
    role?: string;
    tokenVersion?: number;
    exp?: number;
}

export interface RefreshTokenPayload extends Omit<TokenPayload, 'role'> {
    tokenFamily: string;
}

const TOKEN_EXPIRATION = '15m'; // Reduced for security
const REFRESH_TOKEN_EXPIRATION = '7d';

export const generateTokenPair = (user: TokenPayload) => {
    const tokenFamily = crypto.randomBytes(16).toString('hex');
    
    const accessToken = jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role,
            tokenVersion: user.tokenVersion
        },
        SECRET_KEY,
        { expiresIn: TOKEN_EXPIRATION }
    );

    const refreshToken = jwt.sign(
        {
            id: user.id,
            username: user.username,
            tokenVersion: user.tokenVersion,
            tokenFamily
        },
        REFRESH_SECRET_KEY,
        { expiresIn: REFRESH_TOKEN_EXPIRATION }
    );

    return { accessToken, refreshToken, tokenFamily };
};

export const verifyToken = (token: string): TokenPayload => {
    try {
        const decoded = jwt.verify(token, SECRET_KEY) as TokenPayload;
        return decoded;
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new AuthError(401, 'Access token has expired', AuthErrorTypes.TOKEN_EXPIRED);
        }
        throw new AuthError(401, 'Invalid token', AuthErrorTypes.INVALID_TOKEN);
    }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
    try {
        const decoded = jwt.verify(token, REFRESH_SECRET_KEY) as RefreshTokenPayload;
        return decoded;
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new AuthError(401, 'Refresh token has expired', AuthErrorTypes.TOKEN_EXPIRED);
        }
        throw new AuthError(401, 'Invalid refresh token', AuthErrorTypes.INVALID_TOKEN);
    }
};
