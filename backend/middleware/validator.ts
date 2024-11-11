import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AuthError } from '../auth/utils/AuthError';

// Common validation rules
const passwordRules = [
  body('password')
    .isLength({ min: 12, max: 128 })
    .withMessage('Password must be between 12 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must include: uppercase, lowercase, number, and special character')
    .trim(),
];

const usernameRules = [
  body('username')
    .trim()
    .isLength({ min: 5, max: 30 })
    .withMessage('Username must be between 5 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .escape(),
];

const emailRules = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
    .escape(),
];

// Validation chains
export const registrationValidation: ValidationChain[] = [
  ...usernameRules,
  ...emailRules,
  ...passwordRules,
];

export const loginValidation: ValidationChain[] = [
  body('username').trim().notEmpty().withMessage('Username is required').escape(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Validation handler with proper error handling.
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // Execute all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Matches AuthError structure
    const errorMessages = errors.array().map(error => error.msg).join(', ');

    throw new AuthError(
      400,
      errorMessages,
      'VALIDATION_ERROR'
    );
  };
};

// Export validation chains with handler
export const validateRegistration = validate(registrationValidation);
export const validateLogin = validate(loginValidation);
