import express from 'express';
import { paymentRateLimiter } from '../../../middleware/ratelimiter';
import paymentController from '../controllers/paymentController';
import PaymentService from '../services/paymentService';

const router = express.Router();

// Payment Intent routes
router.post('/payment/intent', paymentRateLimiter, async (req, res, next) => {
  try {
    const { amount, currency, idempotencyKey } = req.body;
    const paymentIntent = await PaymentService.createPaymentIntent(amount, currency, idempotencyKey);
    res.json(paymentIntent);
  } catch (error) {
    next(error);
  }
});

// Subscription routes
router.post('/payment/subscription', paymentRateLimiter, async (req, res, next) => {
  try {
    const { customerId, priceId } = req.body;
    const subscription = await PaymentService.createSubscription(customerId, priceId);
    res.json(subscription);
  } catch (error) {
    next(error);
  }
});

// Refund routes
router.post('/payment/refund', paymentRateLimiter, async (req, res, next) => {
  try {
    const { paymentIntentId, amount } = req.body;
    const refund = await PaymentService.refundPayment(paymentIntentId, amount);
    res.json(refund);
  } catch (error) {
    next(error);
  }
});

// Cancel subscription route
router.post('/payment/subscription/cancel', paymentRateLimiter, async (req, res, next) => {
  try {
    const { subscriptionId } = req.body;
    const cancelledSubscription = await PaymentService.cancelSubscription(subscriptionId);
    res.json(cancelledSubscription);
  } catch (error) {
    next(error);
  }
});

// Webhook route - no rate limiting as it's from Stripe
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  paymentController.handleWebhook(req, res).catch(next);
});

export default router;

