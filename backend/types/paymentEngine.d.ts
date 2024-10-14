export interface RefundRequest {
    paymentIntentId: string; // ID of the payment intent to refund
    amount?: number; // Optional: amount to refund (in cents). If omitted, the full amount is refunded.
}

export interface RefundResponse {
    success: boolean; // Indicates if the refund was successful
    refundId: string; // ID of the created refund
}
