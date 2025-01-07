import Stripe from 'stripe';
import { paymentCache } from '../../utils/cache';
import { loggers } from '../../../observability/contextLoggers'
import { Redis } from 'ioredis';
import { paymentMetrics } from '../utils/paymentMetrics';

class PaymentService {
  private stripe: Stripe;
  private redis: Redis;
  private logger = loggers.payment;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia',
      telemetry: false // Disable in production
    });
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  private async withIdempotency<T>(
    operation: () => Promise<T>,
    idempotencyKey: string
  ): Promise<T> {
    const cacheKey = `idempotency:${idempotencyKey}`;
    
    try {
      const cached = await paymentCache.get<T>(cacheKey);
      if (cached) return cached;

      const result = await operation();
      await paymentCache.set(cacheKey, result, 86400); // 24 hours

      return result;
    } catch (error) {
      this.logger.error({ error, idempotencyKey }, 'Idempotency operation failed');
      throw error;
    }
  }

  public async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    try {
      const { customer, amount, currency } = paymentIntent;
      await this.trackSuccessfulPayment(customer as string, amount, currency);
      
      paymentMetrics.transactionAmount.observe(
        { type: 'success', currency },
        amount
      );

      this.logger.info({ 
        paymentIntentId: paymentIntent.id,
        amount,
        currency 
      }, 'Payment processed successfully');
    } catch (error) {
      this.logger.error({ error, paymentIntent }, 'Failed to handle successful payment');
      throw error;
    }
  }

  public async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    try {
      this.logger.warn({ 
        paymentIntentId: paymentIntent.id,
        customer: paymentIntent.customer,
        amount: paymentIntent.amount
      }, 'Payment failed');
      
      paymentMetrics.transactionCounter.inc({
        type: 'payment_intent',
        status: 'failed',
        currency: paymentIntent.currency
      });
    } catch (error) {
      this.logger.error({ error, paymentIntent }, 'Failed to handle payment failure');
      throw error;
    }
  }

  public async createPaymentIntent(amount: number, currency: string, idempotencyKey: string) {
    return this.withIdempotency(
      async () => {
        return this.withRetry(
          async () => {
            const paymentIntent = await this.stripe.paymentIntents.create({
              amount,
              currency,
              payment_method_types: ['card'],
            }, {
              idempotencyKey
            });
            return paymentIntent;
          },
          'createPaymentIntent'
        );
      },
      idempotencyKey
    );
  }

  public async refundPayment(paymentIntentId: string, amount: number) {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
      });
      return refund;
    } catch (error) {
      console.error('Refund processing error:', error);
      throw new Error('Failed to process refund');
    }
  }

  public async createSubscription(customerId: string, priceId: string) {
    const cacheKey = `subscription:${customerId}:${priceId}`;
    try {
      const cachedSubscription = await paymentCache.get(cacheKey);
      if (cachedSubscription) {
        return cachedSubscription;
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
      });

      await paymentCache.set(cacheKey, subscription, 3600);

      return subscription;
    } catch (error) {
      this.logger.error({ error, customerId, priceId }, 'Subscription creation error');
      throw new Error('Failed to create subscription');
    }
  }

  public async cancelSubscription(subscriptionId: string) {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Subscription cancellation error:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  public async createPayPerUseCharge(customerId: string, queryCount: number): Promise<Stripe.PaymentIntent> {
    try {
      const amount = await this.calculateAmount(queryCount);
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        customer: customerId,
        metadata: {
          queryCount,
          type: 'PAY_PER_USE'
        }
      });

      await this.trackUsage(customerId, queryCount);
      return paymentIntent;
    } catch (error) {
      this.logger.error({ error, customerId, queryCount }, 'Failed to create pay-per-use charge');
      throw error;
    }
  }

  private async calculateAmount(queryCount: number): Promise<number> {
    const basePrice = 1500; // $15.00
    const bulkDiscount = queryCount >= 10 ? 0.07 : 0;
    return Math.floor(queryCount * basePrice * (1 - bulkDiscount));
  }

  private async trackUsage(customerId: string, queryCount: number): Promise<void> {
    const key = `usage:${customerId}:${new Date().toISOString().slice(0, 7)}`;
    await this.redis.hincrby(key, 'queries', queryCount);
    
    this.logger.info({ customerId, queryCount }, 'Usage tracked successfully');
  }

  public async getUsageStats(customerId: string): Promise<{
    currentMonth: number;
    totalSpent: number;
  }> {
    const key = `usage:${customerId}:${new Date().toISOString().slice(0, 7)}`;
    const currentMonth = parseInt(await this.redis.hget(key, 'queries') || '0');
    
    const charges = await this.stripe.charges.list({
      customer: customerId,
      limit: 100
    });
    
    const totalSpent = charges.data.reduce((sum, charge) => sum + charge.amount, 0);
    
    return { currentMonth, totalSpent };
  }

  private async trackSuccessfulPayment(
    customerId: string,
    amount: number,
    currency: string
  ): Promise<void> {
    try {
      const key = `payments:${customerId}:${new Date().toISOString().slice(0, 7)}`;
      await this.redis.hincrby(key, 'successful_payments', 1);
      await this.redis.hincrby(key, 'total_amount', amount);
      
      paymentMetrics.transactionCounter.inc({
        type: 'payment_intent',
        status: 'success',
        currency
      });

      this.logger.info({ 
        customerId, 
        amount, 
        currency 
      }, 'Successfully tracked payment');
    } catch (error) {
      this.logger.error({ 
        error, 
        customerId, 
        amount, 
        currency 
      }, 'Failed to track successful payment');
      throw error;
    }
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          this.logger.error({ error, context, attempt }, 'Operation failed permanently');
          throw error;
        }
        
        const delay = Math.min(100 * Math.pow(2, attempt), 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        this.logger.warn({ attempt, context }, 'Retrying failed operation');
      }
    }
    
    // TypeScript knows this is unreachable
    throw new Error('Unreachable');
  }

  private isRetryableError(error: unknown): boolean {
    return error instanceof Stripe.errors.StripeConnectionError ||
           error instanceof Stripe.errors.StripeAPIError ||
           error instanceof Stripe.errors.StripeRateLimitError;
  }
}

export default new PaymentService();
