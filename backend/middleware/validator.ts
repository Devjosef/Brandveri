import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Define the validation chain
export const registrationValidation: ValidationChain[] = [
  body('username')
    .isLength({ min: 5 })
    .withMessage('Username must be at least 5 characters long'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter and one number, and no special characters or hyphens')
];

// Middleware to handle validation result
const handleValidationResult = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next(); // Ensure next() is called if there are no errors
};

// Combine validation chain and result handler
export const validateRegistration = [...registrationValidation, handleValidationResult];
