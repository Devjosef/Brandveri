import {
  CircuitBreakerHealth,
  CircuitBreakerMetrics,
  ICircuitBreaker
} from '../../types/circuitBreaker';
import { EventEmitter } from 'events';

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  healthCheckInterval: number;
  maxConcurrent: number;
}

// Implements circuit breaker pattern to prevent cascading failures in this distributed system.
export class CircuitBreaker implements ICircuitBreaker {
    // Tracks consecutive failures to determine circuit state.
    private failures: number = 0;
    // Tracks when the last failure occurred for timeout calculations.
    private lastFailureTime?: Date;
    private readonly name: string;
    private readonly failureThreshold: number;
    private readonly resetTimeout: number;
    private readonly maxConcurrent: number;
    private currentConcurrent: number = 0;
    private healthCheckTimer?: NodeJS.Timeout;
    private readonly stateChangeEmitter = new EventEmitter();
    private readonly metrics: CircuitBreakerMetrics = {
        stateChanges: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        lastStateChange: new Date()
    };
    
    
    constructor(
      name: string,
      // Configures failure tolerance and recovery timing.
      options: CircuitBreakerOptions
    ) {
        this.name = name;
        this.failureThreshold = options.failureThreshold;
        this.resetTimeout = options.resetTimeout;
        this.maxConcurrent = options.maxConcurrent;
        
        // Setup health check interval
        if (options.healthCheckInterval > 0) {
            this.healthCheckTimer = setInterval(() => {
                this.checkHealth();
            }, options.healthCheckInterval);
        }
    }
  
    // Wraps async operations with circuit breaker protection.
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        this.metrics.totalExecutions++;
        
        if (this.isOpen()) {
            this.metrics.failedExecutions++;
            throw new Error(`Circuit breaker for ${this.name} is open`);
        }

        if (this.currentConcurrent >= this.maxConcurrent) {
            this.metrics.failedExecutions++;
            throw new Error(`Circuit breaker for ${this.name} has reached maximum concurrent operations`);
        }

        this.currentConcurrent++;
        
        try {
            const result = await fn();
            this.metrics.successfulExecutions++;
            this.reset();
            return result;
        } catch (error) {
            this.metrics.failedExecutions++;
            this.recordFailure();
            throw error;
        } finally {
            this.currentConcurrent--;
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
            if (this.lastFailureTime && 
                (now.getTime() - this.lastFailureTime.getTime()) > this.calculateResetTimeout()) {
                this.reset();
                return false;
            }
            return true;
        }
        return false;
    }
  
    // Reset the circuit state after a successful operation or timeout.
    public reset(): void {
        const previousState = this.isOpen();
        this.failures = 0;
        this.lastFailureTime = undefined;
        
        if (previousState) {
            this.metrics.stateChanges++;
            this.metrics.lastStateChange = new Date();
            this.stateChangeEmitter.emit('stateChange', 'closed');
        }
    }
  
    // Tracks failures to determine when to open a circuit.
    public recordFailure(): void {
        const previousState = this.isOpen();
        this.failures++;
        this.lastFailureTime = new Date();
        
        if (!previousState && this.isOpen()) {
            this.metrics.stateChanges++;
            this.metrics.lastStateChange = new Date();
            this.stateChangeEmitter.emit('stateChange', 'open');
        }
    }

    public getHealth(): CircuitBreakerHealth {
        return {
            status: this.isOpen() ? 'open' : 'closed',
            failures: this.failures,
            failureThreshold: this.failureThreshold,
            resetTimeout: this.resetTimeout,
            lastFailureTime: this.lastFailureTime?.toISOString(),
            currentConcurrent: this.currentConcurrent,
            maxConcurrent: this.maxConcurrent,
            metrics: this.metrics
        };
    }

    private checkHealth(): void {
        if (this.isOpen() && 
            this.lastFailureTime && 
            (Date.now() - this.lastFailureTime.getTime()) > this.resetTimeout) {
            this.reset();
        }
    }

    // Cleanup resources
    public dispose(): void {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        this.stateChangeEmitter.removeAllListeners();
    }

    private calculateResetTimeout(): number {
        const jitter = Math.random() * 0.3 - 0.15; // ±15%
        return this.resetTimeout * (1 + jitter);
    }

    public on(event: 'stateChange', listener: (state: string) => void): void {
        this.stateChangeEmitter.on(event, listener);
    }
}

  // Prevents overwhelming the API during issues, provides fast failure when service is degraded.
  // Allows the system to recover gracefully.