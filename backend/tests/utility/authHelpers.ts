import jwt from 'jsonwebtoken';
import { config } from '../../src/config';

/**
 * Authentication helpers for testing.
 */
export const generateTestToken = (userId: string, role: string = 'user'): string => {
  return jwt.sign({ userId, role }, config.JWT_SECRET, { expiresIn: '1h' });
};

export const createAuthHeader = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`
});