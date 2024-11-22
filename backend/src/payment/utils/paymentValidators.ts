import { z } from 'zod';

export const paymentIntentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  idempotencyKey: z.string().min(1)
});

export const subscriptionSchema = z.object({
  customerId: z.string().min(1),
  priceId: z.string().min(1)
});

export const refundSchema = z.object({
  paymentIntentId: z.string().min(1),
  amount: z.number().positive().optional()
});