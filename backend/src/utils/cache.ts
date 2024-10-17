import redisClient from '../../cache/redis';

// Cache setter with expiration time (in seconds)
export const setCache = async (key: string, value: any, ttl = 3600): Promise<void> => {
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttl);
    console.log(`Cache set for key: ${key}`);
  } catch (error) {
    console.error(`Error setting cache for key: ${key}`, error);
  }
};

// Cache getter
export const getCache = async (key: string): Promise<any | null> => {
  try {
    const data = await redisClient.get(key);
    if (data) {
      console.log(`Cache hit for key: ${key}`);
      return JSON.parse(data);
    }
    console.log(`Cache miss for key: ${key}`);
    return null;
  } catch (error) {
    console.error(`Error getting cache for key: ${key}`, error);
    return null;
  }
};

// Cache invalidation
export const invalidateCache = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
    console.log(`Cache invalidated for key: ${key}`);
  } catch (error) {
    console.error(`Error invalidating cache for key: ${key}`, error);
  }
};