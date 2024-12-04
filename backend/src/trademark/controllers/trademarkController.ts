import { Request, Response,} from 'express';
import { trademarkService } from '../services/trademarkService';
import { CircuitBreaker } from '../../utils/CircuitBreaker';
import { 
    validateTrademarkSearch, 
    featureFlags,
} from '../utils/validation';
import { RequestContext } from '../../utils/requestContext';
import { Counter, Histogram } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';
import { Invariant } from '../../utils/invariant';
import { 
    TrademarkSearchParams, 
} from '../../../types/trademark';
import { sensitiveOpsLimiter } from '../../../middleware/ratelimiter';

const logger = loggers.trademark;

const controllerMetrics = {
    requests: new Counter({
        name: 'trademark_controller_requests_total',
        help: 'Total number of trademark controller requests',
        labelNames: ['method', 'endpoint', 'status']
    }),
    latency: new Histogram({
        name: 'trademark_controller_latency_seconds',
        help: 'Latency of trademark controller operations',
        labelNames: ['method', 'endpoint'],
        buckets: [0.1, 0.5, 1, 2, 5]
    })
};

export class TrademarkController {
    private readonly controllerBreaker: CircuitBreaker;

    constructor() {
        this.controllerBreaker = new CircuitBreaker('trademark-controller', {
            failureThreshold: 5,
            resetTimeout: 30000
        });

        Invariant.assert(
            this.controllerBreaker !== null,
            'Circuit breaker must be initialized'
        );
    }

    async searchTrademark(req: Request, res: Response): Promise<void> {
        const timer = controllerMetrics.latency.startTimer();
        const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
        const context = new RequestContext(correlationId.toString());
        
        try {
            if (featureFlags.TRADEMARK.ENABLE_RATE_LIMITING) {
                const clientIp = req.ip || 'unknown-ip';
                await sensitiveOpsLimiter.consume(clientIp);
            }

            const validationResult = await this.validateSearchParams(req, res);
            if (!validationResult.success || !validationResult.params) {
                res.status(400).json({ 
                    success: false, 
                    error: 'Invalid search parameters' 
                });
                return;
            }

            const result = await this.controllerBreaker.execute(() => 
                trademarkService.searchTrademark(validationResult.params!)
            );

            controllerMetrics.requests.inc({ 
                method: 'GET', 
                endpoint: '/search', 
                status: 'success' 
            });

            res.status(200).json(result);
        } catch (error) {
            logger.error({ error, params: req.query }, 'Trademark search failed');
            controllerMetrics.requests.inc({ 
                method: 'GET', 
                endpoint: '/search', 
                status: 'error' 
            });
            throw error;
        } finally {
            timer({ method: 'GET', endpoint: '/search' });
            context.clear();
        }
    }

    private async validateSearchParams(req: Request, res: Response): Promise<{ 
        success: boolean; 
        params?: TrademarkSearchParams 
    }> {
        try {
            const validatedParams = await validateTrademarkSearch(
                req.query,
                res,
                (err: any) => {
                    if (err) {
                        throw new Error('Validation failed');
                    }
                }
            );

            if (!validatedParams) {
                return { success: false, params: undefined };
            }

            return { 
                success: true, 
                params: validatedParams 
            };
        } catch (error) {
            logger.error({ error, query: req.query }, 'Search parameter validation failed');
            return { success: false };
        }
    }
}

export const trademarkController = new TrademarkController();
