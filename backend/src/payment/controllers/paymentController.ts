import Stripe from 'stripe';
import { Request, Response } from 'express';
import PaymentService from '../services/paymentService';
import { paymentMetrics } from '../utils/paymentMetrics';
import { loggers } from '../../../observability/contextLoggers';

class PaymentController {
  private logger = loggers.payment;
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia',
      telemetry: false
    });
  }

  private verifyWebhook(payload: string | Buffer, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      this.logger.error({ error: err }, 'Webhook signature verification failed');
      throw err;
    }
  }

  async handleWebhook(req: Request, res: Response): Promise<Response> {
    const startTime = process.hrtime();
    const sig = req.headers['stripe-signature'] as string;

    try {
      const event = this.verifyWebhook(req.body, sig);
      const timer = paymentMetrics.webhookLatency.startTimer({ event_type: event.type });

      await this.processWebhookEvent(event);
      
      timer();
      this.recordMetrics(event);
      
      return res.json({ received: true });
    } catch (error) {
      const duration = process.hrtime(startTime)[0];
      this.logger.error({ error, duration }, 'Webhook processing failed');
      
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
      
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  private async processWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await PaymentService.handlePaymentSucceeded(paymentIntent);
        break;
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await PaymentService.handlePaymentFailed(failedPayment);
        break;
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdate(subscription);
        break;
      default:
        this.logger.info({ eventType: event.type }, 'Unhandled webhook event');
    }
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    this.logger.info({ subscriptionId: subscription.id }, 'Processing subscription update');
    // Add specific subscription update logic here
  }

  private recordMetrics(event: Stripe.Event): void {
    paymentMetrics.transactionCounter.inc({
      type: event.type,
      status: 'processed',
      currency: 'usd'
    });
  }
}

export default new PaymentController();
