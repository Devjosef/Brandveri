import pino from 'pino';
import { LoggerConfiguration } from './config';
import { EventEmitter } from 'events';

type Environment = 'development' | 'staging' | 'production';

class LoggerManager extends EventEmitter {
  private static instance: LoggerManager;
  private loggers: Map<Environment, pino.Logger>;
  private isShuttingDown = false;
  private currentEnv: Environment;

  private constructor() {
    super();
    LoggerConfiguration.initialize();
    
    this.loggers = new Map();
    this.currentEnv = (process.env.NODE_ENV as Environment) || 'development';
    this.initializeLoggers();
    this.setupErrorHandling();
  }

  private initializeLoggers(): void {
    try {
      // Development logger
      const devConfig = LoggerConfiguration.createConfig({
        isDevelopment: true,
        pretty: true,
        includeDebug: true
      });
      this.loggers.set('development', pino(devConfig));

      // Staging logger
      const stagingConfig = LoggerConfiguration.createConfig({
        isDevelopment: false,
        pretty: false,
        includeDebug: true
      });
      this.loggers.set('staging', pino(stagingConfig));

      // Production logger
      const prodConfig = LoggerConfiguration.createConfig({
        isDevelopment: false,
        pretty: false,
        includeDebug: false
      });
      this.loggers.set('production', pino(prodConfig));
    } catch (error) {
      console.error('FATAL: Logger initialization failed:', error);
      process.exit(1);
    }
  }

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      this.getCurrentLogger().fatal(error, 'Uncaught exception');
      this.shutdown(1);
    });

    process.on('unhandledRejection', (reason) => {
      this.getCurrentLogger().fatal({ reason }, 'Unhandled rejection');
      this.shutdown(1);
    });
  }

  public async shutdown(code = 0): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    try {
      // Flush all loggers
      await Promise.all(
        Array.from(this.loggers.values()).map(logger => logger.flush())
      );
      process.exit(code);
    } catch (error) {
      console.error('Error during logger shutdown:', error);
      process.exit(1);
    }
  }

  public static getInstance(): LoggerManager {
    if (!LoggerManager.instance) {
      LoggerManager.instance = new LoggerManager();
    }
    return LoggerManager.instance;
  }

  public getCurrentLogger(): pino.Logger {
    const logger = this.loggers.get(this.currentEnv);
    if (!logger) {
      throw new Error(`Logger not initialized for environment: ${this.currentEnv}`);
    }
    return logger;
  }

  public getLogger(env: Environment): pino.Logger {
    const logger = this.loggers.get(env);
    if (!logger) {
      throw new Error(`Logger not initialized for environment: ${env}`);
    }
    return logger;
  }
}

export const rootLogger = LoggerManager.getInstance().getCurrentLogger();
export type Logger = typeof rootLogger;