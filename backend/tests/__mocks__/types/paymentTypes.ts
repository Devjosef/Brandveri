// Payment status types
export type PaymentStatus = 'succeeded' | 'failed' | 'pending' | 'refunded' | 'error';

// Error types
export interface PaymentError {
  code: string;
  message: string;
  decline_code?: string;
}

// Card details
export interface CardDetails {
  last4: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'discover';
  exp_month: number;
  exp_year: number;
}

// Customer types
export interface Customer {
  id: string;
  email: string;
  created: number;
  metadata?: Record<string, string>;
}

// Token types
export interface Token {
  id: string;
  card: CardDetails;
  created: number;
}

// Charge response
export interface ChargeResponse {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  created: number;
  metadata?: Record<string, string>;
  error?: PaymentError;
}

// Payment gateway mock interface
export interface PaymentGatewayMock {
  charges: {
    create: jest.Mock<Promise<ChargeResponse>>;
    retrieve: jest.Mock<Promise<ChargeResponse>>;
    refund: jest.Mock<Promise<ChargeResponse>>;
  };
  customers: {
    create: jest.Mock<Promise<Customer>>;
    update: jest.Mock<Promise<Customer>>;
  };
  tokens: {
    create: jest.Mock<Promise<Token>>;
  };
}
