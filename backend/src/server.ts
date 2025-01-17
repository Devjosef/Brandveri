// Load environment variables first, before any other imports
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from the root directory
dotenv.config({
  path: path.resolve(__dirname, '../../.env')
});

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { config } from './config';
import { errorHandler } from '../middleware/errorHandler';
import { loggingMiddleware } from '../observability/loggingMiddleware';
import healthCheckRouter from '../cache/healthCheck';
import { setupMetrics } from '../observability/metrics';
import { setupTracing } from '../observability/opentelemetry';
import { 
  authRateLimiter, 
  sensitiveOpsLimiter, 
  paymentRateLimiter, 
  customStore
} from '../middleware/ratelimiter';
import { securityHeaders } from '../middleware/securityHeaders';
import { healthCheck } from '../middleware/serverHealth';
import PaymentService from '../src/payment/services/paymentService';
import sequelize from '../database/config';
import redis from '../cache/redis';
import { metricsRegistry } from '../observability/metrics';
import { openTelemetry } from '../observability/opentelemetry';


// Import domain specific routes
import { trademarkRoutes } from './trademark/routes/trademarkRoutes';
import { copyrightRoutes } from './copyright/routes/copyrightRoutes';
import { recommendationRoutes } from './recommendationengine/routes/recommendationRoutes';



class Server {
  private app: Express;
  private server: ReturnType<typeof createServer>;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupGracefulShutdown();
  }

  private setupMiddleware(): void {
    // Security middleware.
    this.app.use(helmet({
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: true,
      dnsPrefetchControl: true,
      frameguard: true,
      hidePoweredBy: true,
      hsts: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: true,
      xssFilter: true
    }));
    
    this.app.use(cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400 // 24 hours
    }));
    
    this.app.use(securityHeaders);

    // Rate limiting middleware
    this.app.use('/api/auth', authRateLimiter);
    this.app.use('/api/v1/payment', paymentRateLimiter);
    
    // Sensitive operations rate limiting is applied per-route
    this.app.use('/api/v1/trademark/register', sensitiveOpsLimiter);
    this.app.use('/api/v1/trademark/update', sensitiveOpsLimiter);
    this.app.use('/api/v1/copyright/register', sensitiveOpsLimiter);
    this.app.use('/api/v1/recommendation/analyze', sensitiveOpsLimiter);

    // Performance middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '10kb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    // Observability middleware
    this.app.use(loggingMiddleware);
    setupMetrics(this.app);
    setupTracing();
  }

  private setupRoutes(): void {
    // Health and monitoring routes specific to cache.
    this.app.use('/health', healthCheckRouter);
    this.app.use('/health/system', healthCheck);
    
    // API routes with versioning
    const apiRouter = express.Router();
    
    // Apply rate limiters to specific route groups
    apiRouter.use('/trademark', trademarkRoutes);
    apiRouter.use('/copyright', copyrightRoutes);
    apiRouter.use('/recommendation', recommendationRoutes);
    
    this.app.use('/api/v1', apiRouter);
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log(`${signal} received: starting graceful shutdown`);

      // Stop accepting new requests
      this.server.close(async () => {
        try {
          // Wait for active transactions first
          await this.waitForActiveTransactions();
          
          // Then close connections and cleanup
          await Promise.all([
            this.closeDBConnections(),
            this.closeCacheConnections(),
            this.cleanupRateLimiter(),
            this.shutdownObservability()
          ]);
          
          console.log('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000); // 30 seconds timeout
    };

    // Shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  private async waitForActiveTransactions(): Promise<void> {
    try {
        // Check for active Stripe payment intents
        const activePayments = await PaymentService.stripe.paymentIntents.list({
            limit: 100,
            created: {
                // Last hour
                gte: Math.floor(Date.now() / 1000) - 3600
            }
        });

        const processingPayments = activePayments.data.filter(
            payment => payment.status === 'processing'
        );

        if (processingPayments.length > 0) {
            console.log(`Waiting for ${processingPayments.length} Stripe payments to complete...`);
            await Promise.all(processingPayments.map(async (payment) => {
                try {
                    console.log(`Waiting for payment ${payment.id}...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } catch (error) {
                    console.error(`Error waiting for payment ${payment.id}:`, error);
                }
            }));
            console.log('All Stripe payments processed');
        }
    } catch (error) {
        console.error('Error checking Stripe payments:', error);
        throw error;
    }
}

  private async closeDBConnections(): Promise<void> {
    try {
      await sequelize.close();
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
      throw error;
    }
  }

  private async closeCacheConnections(): Promise<void> {
    try {
      await redis.quit();
      console.log('Cache connections closed');
    } catch (error) {
      console.error('Error closing cache connections:', error);
      throw error;
    }
  }

  private async cleanupRateLimiter(): Promise<void> {
    try {
        await customStore.reset();
        console.log('Rate limiter cleaned up');
    } catch (error) {
        console.error('Error cleaning up rate limiter:', error);
        throw error;
    }
  }

  private async shutdownObservability(): Promise<void> {
    try {
        // Shutdown metrics and tracing using the proper instances
        await Promise.all([
            metricsRegistry.clear(), // From metrics.ts
            openTelemetry.shutdown() // From opentelemetry.ts
        ]);
        console.log('Observability systems shutdown');
    } catch (error) {
        console.error('Error shutting down observability:', error);
        throw error;
    }
}

  public async start(): Promise<void> {
    try {
      await new Promise<void>((resolve) => {
        this.server.listen(config.port, () => {
          console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
          resolve();
        });
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Create and start server
const server = new Server();
server.start().catch(console.error);

export default server;
