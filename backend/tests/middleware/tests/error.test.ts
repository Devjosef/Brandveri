import { testMiddleware } from '../testMiddleware';
import { errorHandler } from '../../middleware/error';
import { testError } from '../error/error';

describe('Error Handler Middleware', () => {
  it('handles API errors', async () => {
    const error = testError.api('API failed', { 
      status: 400, 
      path: '/test' 
    });

    const { res } = await testMiddleware.execute(
      errorHandler,
      testMiddleware.req(),
      testMiddleware.res(),
      () => { throw error; }
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'API failed',
      path: '/test'
    });
  });

  it('handles database errors', async () => {
    const error = testError.db('Database error');

    const { res } = await testMiddleware.execute(
      errorHandler,
      testMiddleware.req(),
      testMiddleware.res(),
      () => { throw error; }
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error'  // Don't expose DB errors
    });
  });

  it('handles validation errors', async () => {
    const error = new Error('Invalid input');
    error['status'] = 400;
    error['details'] = ['name is required'];

    const { res } = await testMiddleware.execute(
      errorHandler,
      testMiddleware.req(),
      testMiddleware.res(),
      () => { throw error; }
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid input',
      details: ['name is required']
    });
  });

  it('handles unknown errors', async () => {
    const { res } = await testMiddleware.execute(
      errorHandler,
      testMiddleware.req(),
      testMiddleware.res(),
      () => { throw new Error('Something broke'); }
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error'
    });
  });

  it('preserves error status codes', async () => {
    const error = new Error('Not Found');
    error['status'] = 404;

    const { res } = await testMiddleware.execute(
      errorHandler,
      testMiddleware.req(),
      testMiddleware.res(),
      () => { throw error; }
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('sanitizes error messages in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = testError.db('Database secrets exposed');

    const { res } = await testMiddleware.execute(
      errorHandler,
      testMiddleware.req(),
      testMiddleware.res(),
      () => { throw error; }
    );

    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error'
    });

    process.env.NODE_ENV = originalEnv;
  });
});
