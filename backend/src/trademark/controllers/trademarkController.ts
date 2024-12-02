import { Request, Response } from 'express';
import { trademarkService } from '../services/trademarkService';
import { CircuitBreaker } from '../../utils/circuitBreaker';
import { validateTrademarkSearch } from '../utils/validation';
import { RequestContext } from '../../utils/requestContext';
import { Counter } from 'prom-client';
import { loggers } from '../../../observability/contextLoggers';

const logger = loggers.trademark;

const controllerMetrics = new Counter({
    name: 'trademark_controller_requests_total',
    help: 'Total number of trademark controller requests',
    labelNames: ['method', 'endpoint', 'status']
});

export class TrademarkController {
    private readonly controllerBreaker: CircuitBreaker;

    constructor() {
        this.controllerBreaker = new CircuitBreaker('trademark-controller', {
            failureThreshold: 5,
            resetTimeout: 30000
        });
    }

    async searchTrademark(req: Request, res: Response): Promise<void> {
        const context = new RequestContext(req.headers['x-correlation-id'] as string);
        
        try {
            const validatedParams = await validateTrademarkSearch(req.query);
            
            const result = await this.controllerBreaker.execute(() =>
                trademarkService.searchTrademark(validatedParams)
            );

            controllerMetrics.inc({ 
                method: 'GET', 
                endpoint: '/search', 
                status: 'success' 
            });

            res.status(200).json(result);
        } catch (error) {
            logger.error({ error }, 'Trademark search failed');
            controllerMetrics.inc({ 
                method: 'GET', 
                endpoint: '/search', 
                status: 'error' 
            });
            throw error;
        } finally {
            context.clear();
        }
    }
}

export const trademarkController = new TrademarkController();
