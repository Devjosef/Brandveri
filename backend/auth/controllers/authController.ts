import { Request, Response } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { generateToken, generateRefreshToken } from '../utils/tokenUtils';
import UserModel from '../../database/models/User';
import dotenv from 'dotenv';

dotenv.config();

const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_TOKEN;

if (!REFRESH_TOKEN_SECRET) {
    throw new Error('JWT_REFRESH_TOKEN environment variable is not set');
}

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Register a new user
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            res.status(400).json({ message: 'Username, email, and password are required' });
            return;
        }

        const existingUser = await UserModel.findOne({ where: { username } });
        if (existingUser) {
            res.status(400).json({ message: 'Username already exists' });
            return;
        }

        await UserModel.create({
            username,
            email,
            passwordHash: password, // The setter in User.ts will hash this
        });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Login a user and issue access/refresh tokens
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({ message: 'Username and password are required' });
            return;
        }

        const user = await UserModel.findOne({ where: { username } });
        if (!user) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        const isMatch = await user.validatePassword(password);
        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        const accessToken = generateToken({
            id: user.id, // Ensure this matches the expected payload structure
            username: user.username,
        });

        const refreshToken = generateRefreshToken({
            id: user.id,
            username: ''
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: COOKIE_MAX_AGE
        });

        res.json({
            accessToken,
            message: 'Login successful',
        });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// Refresh the access token using a valid refresh token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            res.status(400).json({ message: 'Refresh token is required' });
            return;
        }

        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as any;

        const newAccessToken = generateToken({
            id: decoded.id, 
            username: decoded.username,
        });

        const newRefreshToken = generateRefreshToken({
            id: decoded.id,
            username: ''
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: COOKIE_MAX_AGE
        });

        res.json({ accessToken: newAccessToken });
    } catch (err) {
        if (err instanceof TokenExpiredError) {
            res.status(403).json({ message: 'Refresh token expired' });
        } else if (err instanceof JsonWebTokenError) {
            res.status(403).json({ message: 'Invalid refresh token' });
        } else {
            console.error('Error during token refresh:', err);
            res.status(500).json({ message: 'Server error during token refresh' });
        }
    }
};

// Logout and clear refresh token
export const logout = async (_: Request, res: Response): Promise<void> => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });

    res.status(200).json({ message: 'Logged out successfully' });
};
