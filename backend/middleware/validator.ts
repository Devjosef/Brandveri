import { body, validationResult } from 'express-validator';

export const validateRegistration = [
    body('username').isLength({ min: 5 }).withMessage('Username must be at least 5 characters long'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/).withMessage('Password must contain at least one uppercase letter and one number, and no special characters or hyphens'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];