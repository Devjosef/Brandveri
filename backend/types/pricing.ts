import { z } from 'zod';

export const PricingTierSchema = z.object({
  id: z.string(),
  type: z.enum(['PAY_PER_USE', 'SUBSCRIPTION']),
  basePrice: z.number(),
  currency: z.string().default('usd'),
  features: z.array(z.string()),
  limits: z.object({
    queries: z.number().optional(),
    apiCalls: z.number().optional()
  }).optional()
});

export type PricingTier = z.infer<typeof PricingTierSchema>;

export const PRICING_CONFIG = {
  PAY_PER_USE: {
    basePrice: 1500, // $15.00
    bulkDiscount: 0.07, // 7% discount
    bulkThreshold: 10 // queries
  }
} as const;