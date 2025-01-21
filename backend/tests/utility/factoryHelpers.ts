import { DeepPartial } from 'typeorm';
import { Trademark, User, Payment } from 

/**
 * Factory helpers for generating test data.
 */
export const createTestTrademark = (override: DeepPartial<Trademark> = {}): Partial<Trademark> => ({
  name: 'Test Trademark',
  description: 'Test Description',
  status: 'pending',
  niceClasses: [1, 2, 3],
  ...override
});

export const createTestUser = (override: DeepPartial<User> = {}): Partial<User> => ({
  email: 'test@example.com',
  password: 'hashedPassword123',
  role: 'user',
  ...override
});