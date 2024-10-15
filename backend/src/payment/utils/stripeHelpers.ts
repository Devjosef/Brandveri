import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-09-30.acacia' });

export const createCustomer = async (email: string, name: string): Promise<Stripe.Customer> => {
    const customer = await stripe.customers.create({ email, name });
    return customer;
};

export const createPaymentIntent = async (amount: number, currency: string): Promise<Stripe.PaymentIntent> => {
    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: ['card'],
    });
    return paymentIntent;
};

export const refundPayment = async (paymentIntentId: string, amount?: number): Promise<Stripe.Refund> => {
    const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
    });
    return refund;
};

export const createSubscription = async (customerId: string, priceId: string): Promise<Stripe.Subscription> => {
    const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
    });
    return subscription;
};
export const cancelSubscription = async (subscriptionId: string): Promise<Stripe.Subscription> => {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
};
