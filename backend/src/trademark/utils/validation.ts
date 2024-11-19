import { z } from 'zod';
import { NiceClassification } from '../../../types/trademark';
import { createValidator } from '../../../middleware/validator'

// Extend ValidationContext type in validator.ts
declare module '../../../middleware/validator' {
  interface ValidationContextMap {
    trademark_search: 'trademark_search';
    trademark_registration: 'trademark_registration';
  }
}


// Shared schemas for reuse
const TrademarkSchemas = {
  niceClasses: z.array(
    z.number()
      .int()
      .min(1)
      .max(45)
      .refine(
        (val): val is NiceClassification => 
          Object.values(NiceClassification).includes(val),
        'Invalid Nice classification'
      )
  )
    .refine(
      classes => classes.every(c => Object.values(NiceClassification).includes(c)),
      'Invalid Nice classification'
    ),

  jurisdiction: z.array(z.enum(['USPTO', 'EUIPO']))
    .default(['USPTO', 'EUIPO']),

  description: z.string()
    .trim()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),

  owner: z.object({
    name: z.string().min(1, 'Owner name is required'),
    address: z.string().min(1, 'Owner address is required')
  })
};

// Search validation schema
const TrademarkSearchSchema = z.object({
  q: z.string()
    .trim()
    .min(3, 'Query must be at least 3 characters')
    .max(255, 'Query must not exceed 255 characters')
    .transform(val => val.toLowerCase()),
  
  niceClasses: TrademarkSchemas.niceClasses.optional(),
  jurisdiction: TrademarkSchemas.jurisdiction.optional(),
  
  page: z.number()
    .int()
    .min(1, 'Page must be a positive integer')
    .optional()
    .default(1),
  
  limit: z.number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .optional()
    .default(20)
}).strict();

// Registration validation schema
const TrademarkRegistrationSchema = z.object({
  name: z.string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(255, 'Name must not exceed 255 characters'),
  
  niceClasses: TrademarkSchemas.niceClasses,
  jurisdiction: TrademarkSchemas.jurisdiction,
  description: TrademarkSchemas.description,
  owner: TrademarkSchemas.owner
}).strict();

// Export validators with metrics
export const validateTrademarkSearch = createValidator(
  TrademarkSearchSchema,
  'trademark_search'
);

export const validateTrademarkRegistration = createValidator(
  TrademarkRegistrationSchema,
  'trademark_registration'
);

// Type exports for use in service layer
export type TrademarkSearchSchemaType = z.infer<typeof TrademarkSearchSchema>;
export type TrademarkRegistrationSchemaType = z.infer<typeof TrademarkRegistrationSchema>;