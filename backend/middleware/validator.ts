import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { AuthError } from '../auth/utils/AuthError';
import { sensitiveOpsLimiter } from './ratelimiter';
import { Counter, Histogram } from 'prom-client';

// Metrics for validation monitoring
const validationErrors = new Counter({
  name: 'validation_errors_total',
  help: 'Total number of validation errors',
  labelNames: ['context', 'field']
});

const validationDuration = new Histogram({
  name: 'validation_duration_seconds',
  help: 'Duration of validation operations',
  labelNames: ['context']
});

// Define strict types for validation contexts
type ValidationContext = 'registration' | 'login' | 'passwordReset';

// Centralized validation schemas
const ValidationSchemas = {
  username: z.string()
    .trim()
    .min(5, 'Username must be at least 5 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .transform(val => val.toLowerCase()),

  password: z.string()
    .trim()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must include: uppercase, lowercase, number, and special character'
    ),

  email: z.string()
    .trim()
    .email('Invalid email address')
    .transform(val => val.toLowerCase())
};

// Schema compositions with strict type checking
const RegistrationSchema = z.object({
  username: ValidationSchemas.username,
  email: ValidationSchemas.email,
  password: ValidationSchemas.password
}).strict();

const LoginSchema = z.object({
  username: ValidationSchemas.username,
  password: z.string().min(1, 'Password is required')
}).strict();

// Validation middleware factory with metrics
export const createValidator = (schema: z.ZodSchema, context: ValidationContext) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const end = validationDuration.startTimer({ context });
    
    try {
      const sanitizedData = await schema.parseAsync(req.body);
      req.body = sanitizedData;
      end();
      next();
    } catch (error) {
      end();
      if (error instanceof z.ZodError) {
        error.issues.forEach(issue => {
          validationErrors.inc({
            context,
            field: issue.path.join('.')
          });
        });

        const errorMessage = error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join('; ');

        throw new AuthError(
          400,
          errorMessage,
          'VALIDATION_ERROR'
        );
      }
      next(error);
    }
  };
};

// Export validation middlewares with rate limiting
export const validateRegistration = [
  sensitiveOpsLimiter,
  createValidator(RegistrationSchema, 'registration')
];

export const validateLogin = [
  createValidator(LoginSchema, 'login')
];

// Type guard for runtime validation
export const isValidationError = (error: unknown): error is z.ZodError => {
  return error instanceof z.ZodError;
};