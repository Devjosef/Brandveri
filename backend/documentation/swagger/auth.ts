import { Request, Response, NextFunction } from 'express';
import { loggers } from '../../observability/contextLoggers';
import { Counter } from 'prom-client';
import { AuthError } from '../../auth/utils/AuthError';

const logger = loggers.system;

enum SwaggerAuthErrorCode {
    AUTH_REQUIRED = 401,
    INTERNAL_ERROR = 500
}

const ErrorCode = {
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

// Metrics for Swagger documentation access
const swaggerMetrics = {
    access: new Counter({
        name: 'swagger_docs_access_total',
        help: 'Total number of Swagger documentation access attempts',
        labelNames: ['status']
    })
};

interface SwaggerAuthConfig {
    readonly allowedEnvironments: string[];
    readonly requireAuth: boolean;
}

const defaultConfig: SwaggerAuthConfig = {
    allowedEnvironments: ['development', 'staging'],
    requireAuth: process.env.NODE_ENV === 'production'
};

export class SwaggerAuthMiddleware {
    constructor(private readonly config: SwaggerAuthConfig = defaultConfig) {}

    public authenticate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Skip auth for non-production environments if configured
            if (!this.config.requireAuth && 
                this.config.allowedEnvironments.includes(process.env.NODE_ENV || 'development')) {
                logger.debug('Skipping Swagger auth in non-production environment');
                return next();
            }

            // Verify user is authenticated in production
            if (!req.user) {
                swaggerMetrics.access.inc({ status: 'unauthorized' });
                throw new AuthError(
                    ErrorCode.AUTH_REQUIRED,
                    'Authentication required to access API documentation',
                    SwaggerAuthErrorCode.AUTH_REQUIRED
                );
            }

            // Log successful access
            swaggerMetrics.access.inc({ status: 'success' });
            logger.info({ userId: req.user.id }, 'Successful Swagger docs access');

            next();
        } catch (error) {
            logger.warn({ 
                error,
                userId: req.user?.id
            }, 'Swagger docs access denied');

            if (error instanceof AuthError) {
                return res.status(error.statusCode).json({
                    error: error.code,
                    message: error.message
                });
            }

            return res.status(SwaggerAuthErrorCode.INTERNAL_ERROR).json({
                error: ErrorCode.INTERNAL_ERROR,
                message: 'Internal server error while authenticating documentation access'
            });
        }
    };
}

// Export singleton instance with default config
export const swaggerAuth = new SwaggerAuthMiddleware();