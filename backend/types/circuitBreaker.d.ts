export interface CircuitBreakerOptions {
    readonly failureThreshold: number;
    readonly resetTimeout: number;
}

export interface CircuitBreakerState {
    readonly isOpen: boolean;
    readonly failures: number;
    readonly lastFailureTime?: Date;
}

export interface CircuitBreakerMetrics {
    stateChanges: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastStateChange: Date;
}

export interface CircuitBreakerHealth {
    readonly status: 'open' | 'closed';
    readonly failures: number;
    readonly failureThreshold: number;
    readonly resetTimeout: number;
    readonly lastFailureTime?: string;
    readonly maxConcurrent?: number;
    readonly currentConcurrent?: number;
    readonly metrics: CircuitBreakerMetrics;
}

export interface ICircuitBreaker {
    isOpen(): boolean;
    recordFailure(): void;
    reset(): void;
    getFailureCount(): number;
    getHealth(): CircuitBreakerHealth;
    on(event: 'stateChange', listener: (state: string) => void): void;
    dispose(): void;
}