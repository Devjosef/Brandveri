import Stripe from 'stripe';

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
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: ['card'],
      });
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
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
      });
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
