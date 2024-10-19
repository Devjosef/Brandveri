import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateToken, generateRefreshToken } from '../utils/tokenUtils';
import UserModel from '../../database/models/User';
import dotenv from 'dotenv';

dotenv.config();

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_TOKEN;
const REFRESH_TOKEN_EXPIRATION = '7d';

// Rate limiting and other protections (like express-rate-limit) can be applied in middleware

// Register a new user
export const register = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        const existingUser = await UserModel.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = new UserModel({
            username,
            password: hashedPassword,
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Login a user and issue access/refresh tokens
export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        const user = await UserModel.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        // Securely set refresh token in HttpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, // Securely store the refresh token
            secure: process.env.NODE_ENV === 'production', // Only use in production with HTTPS
            sameSite: 'strict', // Prevent CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
        });

        res.json({
            accessToken,
            message: 'Login successful',
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error during login' });
    }
};

// Refresh the access token using a valid refresh token
export const refreshToken = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.cookies; // Access the refresh token from the secure cookie

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as any;

        // Issue new tokens
        const newAccessToken = generateToken({
            _id: decoded.id,
            username: decoded.username,
            role: decoded.role
        });

        const newRefreshToken = generateRefreshToken({
            _id: decoded.id,
            username: decoded.username
        });

        // Rotate the refresh token
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ accessToken: newAccessToken });
    } catch (err) {
        res.status(403).json({ message: 'Invalid refresh token' });
    }
};

// Logout and clear refresh token
export const logout = async (req: Request, res: Response) => {
    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });

    res.status(200).json({ message: 'Logged out successfully' });
};
