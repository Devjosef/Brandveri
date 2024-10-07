import { body, query } from 'express-validator';

export const validateTrademarkRegistration = [
  body('searchTerm')
    .isString().withMessage('Search term must be a string')
    .isLength({ min: 3, max: 255 }).withMessage('Search term must be between 3 and 255 characters long'),
  body('email')
    .optional()
    .isEmail().withMessage('Must be a valid email address'),
  body('phoneNumber')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Must be a valid international phone number'),
  body('additionalField')
    .custom((value, { req }) => {
      if (req.body.someOtherField && !value) {
        throw new Error('additionalField is required when someOtherField is present');
      }
      return true;
    }),
];

export const validateTrademarkSearch = [
  query('q')
    .isString().withMessage('Query must be a string')
    .isLength({ min: 1 }).withMessage('Query must not be empty'),
];
