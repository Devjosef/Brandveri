export interface CircuitBreakerOptions {
    readonly failureThreshold: number;
    readonly resetTimeout: number;
}

export interface CircuitBreakerState {
    readonly isOpen: boolean;
    readonly failures: number;
    readonly lastFailureTime?: Date;
}

export interface CircuitBreakerHealth {
    readonly status: 'open' | 'closed';
    readonly failures: number;
    readonly failureThreshold: number;
    readonly resetTimeout: number;
    readonly lastFailureTime?: string;
}

export interface ICircuitBreaker {
    isOpen(): boolean;
    recordFailure(): void;
    reset(): void;
    getFailureCount(): number;
    getHealth(): CircuitBreakerHealth;
}