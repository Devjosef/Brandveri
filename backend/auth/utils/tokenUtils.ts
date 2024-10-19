import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;
const REFRESH_SECRET_KEY = process.env.JWT_REFRESH_TOKEN;

if (!SECRET_KEY || !REFRESH_SECRET_KEY) {
    throw new Error('JWT_SECRET or JWT_REFRESH_TOKEN environment variable is not set');
}

interface User {
    _id: string;
    username: string;
    role?: string;
}

const TOKEN_EXPIRATION = '1h';
const REFRESH_TOKEN_EXPIRATION = '7d';

// Generate an access token for a user
export const generateToken = (user: User) => {
    const payload = {
        id: user._id,
        username: user.username,
        role: user.role,
    };

    return jwt.sign(payload, SECRET_KEY, { expiresIn: TOKEN_EXPIRATION });
};

// Generate a refresh token for a user using a different secret
export const generateRefreshToken = (user: User) => {
    const payload = {
        id: user._id,
        username: user.username,
    };

    return jwt.sign(payload, REFRESH_SECRET_KEY, { expiresIn: REFRESH_TOKEN_EXPIRATION });
};

// Verify the access token passed in the request headers
export const verifyToken = (token: string) => {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            console.error('Access token has expired');
            throw new Error('TokenExpired');
        } else if (err instanceof Error) {
            console.error('Token verification failed:', err.message);
            throw new Error('InvalidToken');
        } else {
            console.error('An unknown error occurred during token verification');
            throw new Error('UnknownError');
        }
    }
};

// Verify the refresh token passed in the request headers
export const verifyRefreshToken = (token: string) => {
    try {
        return jwt.verify(token, REFRESH_SECRET_KEY);
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            console.error('Refresh token has expired');
            throw new Error('RefreshTokenExpired');
        } else if (err instanceof Error) {
            console.error('Refresh token verification failed:', err.message);
            throw new Error('InvalidRefreshToken');
        } else {
            console.error('An unknown error occurred during refresh token verification');
            throw new Error('UnknownError');
        }
    }
};
