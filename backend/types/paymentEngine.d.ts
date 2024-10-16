export interface PaymentRequest {
    amount: number; // Amount in cents
    currency: string; // Currency code (e.g., 'usd')
}

export interface PaymentResponse {
    clientSecret: string; // Client secret for the payment intent
}

export interface RefundRequest {
    paymentIntentId: string; // ID of the payment intent to refund
    amount?: number; // Optional: amount to refund (in cents). If omitted, the full amount is refunded.
}

export interface RefundResponse {
    success: boolean; // Indicates if the refund was successful
    refundId: string; // ID of the created refund
}

export interface SubscriptionRequest {
    userId: string; // ID of the user subscribing
    planId: string; // ID of the plan to subscribe to
}

export interface SubscriptionResponse {
    subscriptionId: string; // ID of the created subscription
    status: string; // Status of the subscription (e.g., 'active')
}

export interface WebhookEvent {
    payload: any; // Raw payload from the webhook
    signature: string; // Signature for verifying the webhook
}