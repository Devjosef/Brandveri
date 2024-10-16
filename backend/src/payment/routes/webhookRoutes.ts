import express from 'express';
import paymentController from '../controllers/paymentController';

const router = express.Router();

router.post('/stripe/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  paymentController.handleWebhook(req, res).catch(next);
});

export default router;

