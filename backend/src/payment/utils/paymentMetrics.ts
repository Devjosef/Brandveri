import { Counter, Histogram } from 'prom-client';

export const paymentMetrics = {
  transactionCounter: new Counter({
    name: 'payment_transactions_total',
    help: 'Total number of payment transactions',
    labelNames: ['type', 'status', 'currency']
  }),

  transactionAmount: new Histogram({
    name: 'payment_transaction_amount',
    help: 'Distribution of payment amounts',
    labelNames: ['type', 'currency'],
    buckets: [1000, 5000, 10000, 50000, 100000]
  }),

  webhookLatency: new Histogram({
    name: 'payment_webhook_duration_seconds',
    help: 'Duration of webhook processing',
    labelNames: ['event_type'],
    buckets: [0.1, 0.5, 1, 2, 5]
  })
};