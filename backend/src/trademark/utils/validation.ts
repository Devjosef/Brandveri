import { body, query, ValidationChain } from 'express-validator';
import { NiceClassification } from '../../../types/trademark';

export const validateTrademarkSearch: ValidationChain[] = [
  query('q')
    .isString().withMessage('Query must be a string')
    .isLength({ min: 3, max: 255 }).withMessage('Query must be between 3 and 255 characters')
    .trim()
    .escape(),
  
  query('niceClasses')
    .optional()
    .isArray().withMessage('Nice classes must be an array')
    .custom((classes: number[]) => {
      return classes.every(c => Object.values(NiceClassification).includes(c));
    }).withMessage('Invalid Nice classification'),
    
  query('jurisdiction')
    .optional()
    .isArray().withMessage('Jurisdiction must be an array')
    .custom((jurisdictions: string[]) => {
      return jurisdictions.every(j => ['USPTO', 'EUIPO'].includes(j));
    }).withMessage('Invalid jurisdiction'),
    
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

export const validateTrademarkRegistration: ValidationChain[] = [
  body('name')
    .isString().withMessage('Name must be a string')
    .isLength({ min: 3, max: 255 }).withMessage('Name must be between 3 and 255 characters')
    .trim(),
  
  body('niceClasses')
    .isArray().withMessage('Nice classes must be an array')
    .custom((classes: number[]) => {
      return classes.every(c => Object.values(NiceClassification).includes(c));
    }).withMessage('Invalid Nice classification'),
  
  body('jurisdiction')
    .isIn(['USPTO', 'EUIPO']).withMessage('Invalid jurisdiction'),
  
  body('description')
    .optional()
    .isString().withMessage('Description must be a string')
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  
  body('owner')
    .isObject().withMessage('Owner information is required')
    .custom((value) => {
      if (!value.name || !value.address) {
        throw new Error('Owner must include name and address');
      }
      return true;
    })
];