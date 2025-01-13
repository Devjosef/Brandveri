// Entry Point.
import swaggerUi from 'swagger-ui-express';
import { Router, RequestHandler } from 'express';
import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'fs';
import path from 'path';
import { swaggerAuth } from './auth';
import { loggers } from '../../observability/contextLoggers';
import { Counter, Histogram } from 'prom-client';

const logger = loggers.system;

// Load OpenAPI specification
const swaggerDocument = parseYaml(
    readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8')
) as Record<string, any>;

// Metrics for Swagger UI
const swaggerMetrics = {
    requests: new Counter({
        name: 'swagger_ui_requests_total',
        help: 'Total number of Swagger UI requests',
        labelNames: ['path', 'status']
    }),
    responseTime: new Histogram({
        name: 'swagger_ui_response_time_seconds',
        help: 'Swagger UI response time in seconds',
        labelNames: ['path'],
        buckets: [0.1, 0.5, 1, 2, 5]
    })
};

const router = Router();

// Swagger UI configuration
const swaggerOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        deepLinking: true,
        tryItOutEnabled: true,
        syntaxHighlight: {
            activated: true,
            theme: 'monokai'
        }
    },
    customSiteTitle: "Brandveri API Documentation"
};

// Metrics middleware
const metricsMiddleware = (req: any, res: any, next: any) => {
    const start = process.hrtime();
    
    res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds + nanoseconds / 1e9;
        
        swaggerMetrics.requests.inc({
            path: req.path,
            status: res.statusCode
        });
        
        swaggerMetrics.responseTime.observe(
            { path: req.path },
            duration
        );
    });
    
    next();
};

// Health check endpoint
router.get('/api-docs/health', (_req, res) => {
    res.json({
        status: 'healthy',
        version: swaggerDocument.info.version,
        timestamp: new Date().toISOString()
    });
});

// Apply middleware
router.use('/api-docs', 
    metricsMiddleware as RequestHandler,
    swaggerAuth.authenticate as RequestHandler,
    swaggerUi.serve
);

// Mount Swagger UI
router.get('/api-docs', swaggerUi.setup(swaggerDocument, swaggerOptions));

// Error handling
router.use('/api-docs', (err: Error, _req: any, res: any, _next: any) => {
    logger.error({ err }, 'Error in Swagger UI');
    res.status(500).json({
        error: 'SWAGGER_ERROR',
        message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

export const swaggerRouter = router;