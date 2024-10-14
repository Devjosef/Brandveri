import Stripe from 'stripe';
import { PaymentRequest, PaymentResponse, RefundRequest, RefundResponse } from '../types/paymentEngine';

class PaymentService {
    private stripe: Stripe;

    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2020-08-27' });
    }

    public async createPaymentIntent(request: PaymentRequest): Promise<PaymentResponse> {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: request.amount, // Amount in cents
                currency: request.currency,
                payment_method_types: ['card'], // Supported payment methods
            });
            return { clientSecret: paymentIntent.client_secret }; // Return the client secret to the client for confirmation
        } catch (error) {
            console.error('Payment processing error:', error);
            throw new Error('Payment processing failed. Please try again.');
        }
    }

    public async refundPayment(request: RefundRequest): Promise<RefundResponse> {
        try {
            const refund = await this.stripe.refunds.create({
                payment_intent: request.paymentIntentId, // ID of the payment intent to refund
                amount: request.amount, // Amount to refund (in cents)
            });
            return { success: true, refundId: refund.id }; // Return the refund ID to the client
        } catch (error) {
            console.error('Refund processing error:', error);
            throw new Error('Refund processing failed. Please try again.');
        }
    }
}

export default new PaymentService();
