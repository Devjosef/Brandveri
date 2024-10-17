import Stripe from 'stripe';
import { getCache, setCache } from '../../utils/cache'; // Import cache functions

class PaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-09-30.acacia' });
  }

  public async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    try {
      console.log('Payment succeeded for invoice:', invoice.id);
    } catch (error) {
      console.error('Error handling payment success:', error);
      throw new Error('Failed to process payment success');
    }
  }

  public async handlePaymentFailed(invoice: Stripe.Invoice) {
    try {
      console.log('Payment failed for invoice:', invoice.id);
    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw new Error('Failed to process payment failure');
    }
  }

  public async createPaymentIntent(amount: number, currency: string) {
    const cacheKey = `paymentIntent:${amount}:${currency}`;
    try {
      // Check cache first
      const cachedIntent = await getCache(cacheKey);
      if (cachedIntent) {
        return cachedIntent;
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: ['card'],
      });

      // Cache the payment intent
      await setCache(cacheKey, paymentIntent);

      return paymentIntent;
    } catch (error) {
      console.error('Payment intent creation error:', error);
      throw new Error('Failed to create payment intent');
    }
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
      // Check cache first
      const cachedSubscription = await getCache(cacheKey);
      if (cachedSubscription) {
        return cachedSubscription;
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
      });

      // Cache the subscription
      await setCache(cacheKey, subscription);

      return subscription;
    } catch (error) {
      console.error('Subscription creation error:', error);
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
}

export default new PaymentService();
