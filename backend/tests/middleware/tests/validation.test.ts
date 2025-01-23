import { testMiddleware } from '../testMiddleware';
import { validateRequest } from '../../middleware/validation';
import { ValidationSchema } from '../../types/validation';

describe('Validation Middleware', () => {
  // Test schema.
  const userSchema: ValidationSchema = {
    name: { type: 'string', required: true, min: 2 },
    email: { type: 'string', required: true, pattern: 'email' },
    age: { type: 'number', min: 18 }
  };

  it('allows valid payload', async () => {
    const { next } = await testMiddleware.execute(
      validateRequest(userSchema),
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

  it('blocks missing required fields', async () => {
    const { res, next } = await testMiddleware.execute(
      validateRequest(userSchema),
      testMiddleware.req({
        body: {
          name: 'Test User'
        }
      })
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: ['email is required']
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('validates field types', async () => {
    const { res } = await testMiddleware.execute(
      validateRequest(userSchema),
      testMiddleware.req({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          age: 'not-a-number'  // Wrong type
        }
      })
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: ['age must be a number']
    });
  });

  it('validates string patterns', async () => {
    const { res } = await testMiddleware.execute(
      validateRequest(userSchema),
      testMiddleware.req({
        body: {
          name: 'Test User',
          email: 'not-an-email',  // Invalid email
          age: 25
        }
      })
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: ['email must be a valid email address']
    });
  });

  it('validates number ranges', async () => {
    const { res } = await testMiddleware.execute(
      validateRequest(userSchema),
      testMiddleware.req({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          age: 16  // Under minimum
        }
      })
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: ['age must be at least 18']
    });
  });

  it('allows optional fields to be missing', async () => {
    const { next } = await testMiddleware.execute(
      validateRequest(userSchema),
      testMiddleware.req({
        body: {
          name: 'Test User',
          email: 'test@example.com'
          // age is optional
        }
      })
    );

    expect(next).toHaveBeenCalled();
  });

  it('handles multiple validation errors', async () => {
    const { res } = await testMiddleware.execute(
      validateRequest(userSchema),
      testMiddleware.req({
        body: {
          name: 'A',  // too short
          email: 'invalid-email',  // invalid format
          age: 16  // too young
        }
      })
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: expect.arrayContaining([
        'name must be at least 2 characters',
        'email must be a valid email address',
        'age must be at least 18'
      ])
    });
  });
});
