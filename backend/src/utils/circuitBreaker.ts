import {
  CircuitBreakerOptions,
  CircuitBreakerHealth,
  ICircuitBreaker
} from '../../types/circuitBreaker';


// Implements circuit breaker pattern to prevent cascading failures in this distributed system.
export class CircuitBreaker implements ICircuitBreaker {
    // Tracks consecutive failures to determine circuit state.
    private failures: number = 0;
    // Tracks when the last failure occurred for timeout calculations.
    private lastFailureTime?: Date;
    private readonly name: string;
    private readonly failureThreshold: number;
    private readonly resetTimeout: number;
    
    constructor(
      name: string,
      // Configures failure tolerance and recovery timing.
      options: CircuitBreakerOptions
    ) {
        this.name = name;
        this.failureThreshold = options.failureThreshold;
        this.resetTimeout = options.resetTimeout;
    }
  
    // Wraps async operations with circuit breaker protection.
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      if (this.isOpen()) {
        throw new Error(`Circuit breaker for ${this.name} is open`);
      }
  
      try {
        const result = await fn();
        this.reset();
        return result;
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }

    // Returns whether the circuit breaker is in closed state.
    isClosed(): boolean {
        return !this.isOpen();
    }

    // Returns the current number of consecutive failures.
    getFailureCount(): number {
        return this.failures;
    }
  
    // Determines if circuit is in its open state to prevent further calls.
    public isOpen(): boolean {
      if (this.failures >= this.failureThreshold) {
        const now = new Date();
        // Allow circuit to close after a timeout period.
        if (this.lastFailureTime && 
            (now.getTime() - this.lastFailureTime.getTime()) > this.resetTimeout) {
          this.reset();
          return false;
        }
        return true;
      }
      return false;
    }
  
    // Reset the circuit state after a successful operation or timeout.
    public reset(): void {
      this.failures = 0;
      this.lastFailureTime = undefined;
    }
  
    // Tracks failures to determine when to open a circuit.
    public recordFailure(): void {
      this.failures++;
      this.lastFailureTime = new Date();
    }

    public getHealth(): CircuitBreakerHealth {
        return {
            status: this.isOpen() ? 'open' : 'closed',
            failures: this.failures,
            failureThreshold: this.failureThreshold,
            resetTimeout: this.resetTimeout,
            lastFailureTime: this.lastFailureTime?.toISOString()
        };
    }
}

  // Prevents overwhelming the API during issues, provides fast failure when service is degraded.
  // Allows the system to recover gracefully.