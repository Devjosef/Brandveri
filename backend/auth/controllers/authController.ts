import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { generateTokenPair } from '../utils/tokenUtils';
import { AuthError, AuthErrorTypes } from '../utils/AuthError';
import UserModel from '../../database/models/User';
import { verifyRefreshToken } from '../utils/tokenUtils';
import dotenv from 'dotenv';
import { TokenService } from '../services/tokenService';
import { TokenPayload } from '../utils/tokenUtils';
import { AuthenticatedRequestHandler } from '../../types/authentication'




dotenv.config();

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await UserModel.findOne({ where: { username } });
    if (existingUser) {
      throw new AuthError(400, 'Username already exists', AuthErrorTypes.USER_EXISTS);
    }

    await UserModel.create({
      username,
      email,
      passwordHash: password, // Setter hash exists in user
    });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, password } = req.body;

    const user = await UserModel.findOne({ where: { username } });
    if (!user) {
      throw new AuthError(400, 'Invalid credentials', AuthErrorTypes.INVALID_CREDENTIALS);
    }

    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      throw new AuthError(400, 'Invalid credentials', AuthErrorTypes.INVALID_CREDENTIALS);
    }

    const { accessToken, refreshToken } = generateTokenPair({
      id: Number(user.id),
      username: user.username,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE
    });

    res.json({
      status: 'success',
      data: { accessToken },
      message: 'Login successful'
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
      throw new AuthError(400, 'Refresh token is required', AuthErrorTypes.MISSING_FIELDS);
    }

    const decoded = await verifyRefreshToken(oldRefreshToken);
    
    // Verify token family and check if token was used
    const isValid = await TokenService.validateRefreshToken(
      decoded.id,
      decoded.tokenFamily,
      oldRefreshToken
    );
    
    if (!isValid) {
      await TokenService.revokeUserTokens(decoded.id);
      throw new AuthError(401, 'Refresh token reuse detected', AuthErrorTypes.INVALID_TOKEN);
    }

    // Generate new token pair and increment version
    await TokenService.incrementTokenVersion(decoded.id);
    const currentVersion = await TokenService.getTokenVersion(decoded.id);

    const { accessToken, refreshToken: newRefreshToken, tokenFamily } = generateTokenPair({
      ...decoded,
      tokenVersion: currentVersion
    });

    // Store new refresh token
    await TokenService.storeRefreshToken(
      decoded.id,
      tokenFamily,
      newRefreshToken,
      7 * 24 * 60 * 60 // 7 days in seconds
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE
    });

    res.json({
      status: 'success',
      data: { accessToken }
    });
  } catch (error) {
    next(error);
  }
};

export const logout: AuthenticatedRequestHandler<
  never,
  { status: string; message: string }
> = async (req, res, next): Promise<void> => {
  try {
    const authHeader = req.header('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      throw new AuthError(400, 'Token is required', AuthErrorTypes.MISSING_FIELDS);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
    const expirationTime = Math.floor((decoded.exp || 0) - Date.now() / 1000);
    
    await TokenService.blacklistToken(token, Math.max(expirationTime, 0));
    await TokenService.revokeUserTokens(req.user.id);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};
