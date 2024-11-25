// Implements circuit breaker pattern to prevent cascading failures in this distributed system
export class CircuitBreaker {
    // Tracks consecutive failures to determine circuit state.
    private failures = 0;
    // Tracks when the last failure occurred for timeout calculations.
    private lastFailureTime?: number;
    
    constructor(
      private readonly name: string,
      // Configures failure tolerance and recovery timing
      private readonly options: {
        failureThreshold: number;  // Number of failures before the circuit opens
        resetTimeout: number;      // Time in ms before attempting a recovery
      }
    ) {}
  
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
  
    // Determines if circuit is in its open state to prevent further calls.
    private isOpen(): boolean {
      if (this.failures >= this.options.failureThreshold) {
        const now = Date.now();
        // Allow circuit to close after a timeout period.
        if (this.lastFailureTime && (now - this.lastFailureTime) > this.options.resetTimeout) {
          this.reset();
          return false;
        }
        return true;
      }
      return false;
    }
  
    // Reset the circuit state after a successful operation or timeout.
    private reset(): void {
      this.failures = 0;
      this.lastFailureTime = undefined;
    }
  
    // Tracks failures to determine when to open a circuit.
    private recordFailure(): void {
      this.failures++;
      this.lastFailureTime = Date.now();
    }
}

  // Prevents overwhelming the api during issues, provides fast failure when service is degraded.
  // Allows system to recover gracefully