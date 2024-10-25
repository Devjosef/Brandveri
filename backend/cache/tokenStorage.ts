import redisClient from './redis';

// Store a refresh token in Redis
export const storeRefreshToken = async (userId: number, refreshToken: string, expiresIn: number) => {
  try {
    await redisClient.set(`refreshToken:${userId}`, refreshToken, 'EX', expiresIn);
  } catch (error) {
    console.error(`Error storing refresh token for user ${userId}:`, error);
    throw new Error('Failed to store refresh token');
  }
};

// Check if a refresh token is valid
export const isRefreshTokenValid = async (userId: number, refreshToken: string): Promise<boolean> => {
  try {
    const isBlacklisted = await redisClient.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      return false;
    }
    const storedToken = await redisClient.get(`refreshToken:${userId}`);
    return storedToken === refreshToken;
  } catch (error) {
    console.error(`Error validating refresh token for user ${userId}:`, error);
    throw new Error('Failed to validate refresh token');
  }
};

// Invalidate a refresh token
export const invalidateRefreshToken = async (userId: number, refreshToken: string, expiresIn: number) => {
  try {
    await redisClient.del(`refreshToken:${userId}`);
    await redisClient.set(`blacklist:${refreshToken}`, 'true', 'EX', expiresIn);
  } catch (error) {
    console.error(`Error invalidating refresh token for user ${userId}:`, error);
    throw new Error('Failed to invalidate refresh token');
  }
};
