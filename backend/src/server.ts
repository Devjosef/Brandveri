import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { config } from './config';
import { errorHandler } from '../middleware/errorHandler';
import { loggingMiddleware } from '../observability/loggingMiddleware';
import { healthCheck } from '../middleware/healthCheck';
import { setupMetrics } from '../observability/metrics';
import { setupTracing } from '../observability/opentelemetry';

// Import domain specific routes.
import { trademarkRoutes } from './routes/trademark';
import { copyrightRoutes } from './routes/copyright';
import { recommendationRoutes } from './routes/recommendation';

class Server {
  private app: Express;
  private server: ReturnType<typeof createServer>;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Utility middleware
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(loggers);

    // Observability
    setupMetrics(this.app);
    setupTracing();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', healthCheck);

    // API routes
    this.app.use('/api/v1/trademark', trademarkRoutes);
    this.app.use('/api/v1/copyright', copyrightRoutes);
    this.app.use('/api/v1/recommendation', recommendationRoutes);
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public start(): void {
    this.server.listen(config.port, () => {
      console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      this.server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  }
}

// Create and start server
const server = new Server();
server.start();

export default server;
