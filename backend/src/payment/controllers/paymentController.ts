import Stripe from 'stripe';
import { Request, Response } from 'express';
import PaymentService from '../services/paymentService';

class PaymentController {
  async handleWebhook(req: Request, res: Response): Promise<Response> {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-09-30.acacia' });
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      if (err instanceof Error) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      } else {
        console.error('Webhook signature verification failed with an unknown error:', err);
        return res.status(400).send('Webhook Error: An unknown error occurred.');
      }
    }

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await PaymentService.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await PaymentService.handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
      return res.status(500).send('Internal Server Error');
    }

    return res.json({ received: true });
  }
}

export default new PaymentController();
