import { testMiddleware } from '../testMiddleware';
import { createValidator } from '../../../middleware/validator';
import { z } from 'zod';

describe('Validation Middleware', () => {
  const testSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    age: z.number().min(18, 'Must be at least 18 years old').optional()
  });

  it('allows valid payload', async () => {
    const validator = createValidator(testSchema, 'test');
    
    const { next } = await testMiddleware.execute(
      validator,
      testMiddleware.req({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          age: 25
        }
      })
    );

    expect(next).toHaveBeenCalled();
  });

  it('blocks invalid payload', async () => {
    const validator = createValidator(testSchema, 'test');
    
    const { next } = await testMiddleware.execute(
      validator,
      testMiddleware.req({
        body: {
          name: 'A',
          email: 'not-an-email',
          age: 16
        }
      })
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR'
    });
  });
});