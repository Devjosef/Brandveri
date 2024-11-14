/**
 * Payment Engine Types for BrandVeri
 * Handles all payment processing, subscriptions, and refunds
 */

// Currency codes supported by the system
export type SupportedCurrency = 'USD' | 'EUR' | 'GBP';

// Payment status tracking
export enum PaymentStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded',
    PARTIALLY_REFUNDED = 'partially_refunded'
}

export interface PaymentRequest {
    amount: number;              // Amount in smallest currency unit (cents)
    currency: SupportedCurrency; // Supported currency codes
    customerId: string;          // Customer identifier
    metadata?: {
        orderId?: string;
        description?: string;
        invoiceId?: string;
    };
    billingDetails?: {
        name: string;
        email: string;
        address: PaymentAddress;
    };
}

export interface PaymentAddress {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;            // ISO 3166-1 alpha-2
}

export interface PaymentResponse {
    paymentIntentId: string;    // Payment intent identifier
    clientSecret: string;       // Client secret for SDK
    status: PaymentStatus;
    amount: number;
    currency: SupportedCurrency;
    created: Date;
    metadata?: Record<string, unknown>;
}

export interface RefundRequest {
    paymentIntentId: string;    // Payment intent to refund
    amount?: number;            // Amount to refund (in smallest currency unit)
    reason?: RefundReason;      // Reason for refund
    metadata?: Record<string, unknown>;
}

export enum RefundReason {
    DUPLICATE = 'duplicate',
    FRAUDULENT = 'fraudulent',
    REQUESTED_BY_CUSTOMER = 'requested_by_customer',
    SUBSCRIPTION_CANCELED = 'subscription_canceled'
}

export interface RefundResponse {
    refundId: string;
    amount: number;
    status: PaymentStatus;
    created: Date;
    metadata?: Record<string, unknown>;
}

export interface SubscriptionRequest {
    customerId: string;         // Customer identifier
    planId: string;            // Subscription plan identifier
    paymentMethodId: string;   // Payment method to use
    metadata?: {
        promoCode?: string;
        referralSource?: string;
    };
    billingCycleAnchor?: Date; // When to start billing
}

export interface SubscriptionResponse {
    subscriptionId: string;
    status: SubscriptionStatus;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    metadata?: Record<string, unknown>;
}

export enum SubscriptionStatus {
    ACTIVE = 'active',
    PAST_DUE = 'past_due',
    CANCELED = 'canceled',
    INCOMPLETE = 'incomplete',
    INCOMPLETE_EXPIRED = 'incomplete_expired',
    TRIALING = 'trialing',
    UNPAID = 'unpaid'
}

export interface WebhookEvent {
    id: string;
    type: WebhookEventType;
    created: Date;
    data: {
        object: Record<string, unknown>;
    };
    signature: string;          // HMAC signature for verification
}
export enum WebhookEventType {
    PAYMENT_SUCCEEDED = 'payment_succeeded',
    PAYMENT_FAILED = 'payment_failed',
    SUBSCRIPTION_CREATED = 'subscription_created',
    SUBSCRIPTION_UPDATED = 'subscription_updated',
    SUBSCRIPTION_DELETED = 'subscription_deleted'
}