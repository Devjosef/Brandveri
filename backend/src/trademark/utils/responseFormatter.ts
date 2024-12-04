import { Trademark, TrademarkResponse, ResponseMetadata, TrademarkErrorCode } from '../../../types/trademark';
import { Counter } from 'prom-client';
import { config } from '../utils/validation';
import { loggers } from '../../../observability/contextLoggers';
import { RequestContext } from '../../utils/requestContext';
import { TrademarkError } from './trademarkError';

const logger = loggers.trademark;

/**
 * Single metric:
 * - Simplifies monitoring
 * - Reduces metric cardinality
 */
const formatMetrics = new Counter({
    name: 'trademark_format_total',
    help: 'Trademark format operations',
    labelNames: ['status']
});

/**
 * Shared metadata creation:
 * - Ensures consistent metadata across responses.
 * - Reduces code duplication.
 */
const createMetadata = (correlationId: string): ResponseMetadata => ({
    requestId: correlationId,
    timestamp: new Date(),
    path: '/api/trademark',
    correlationId
});

/**
 * Unified formatter:
 * - Single responsibility for response creation
 * - Consistent error handling
 * - Simplified monitoring
 */
export function formatTrademarkResponse(
    data: Readonly<Trademark | Trademark[]>,
    error?: TrademarkError | Error
): Readonly<TrademarkResponse> {
    const context = RequestContext.getCurrentContext();
    const correlationId = context?.correlationId || crypto.randomUUID();
    
    try {
        const response: TrademarkResponse = {
            success: !error,
            version: config.TRADEMARK.VERSION,
            data: Array.isArray(data) ? [...data] : [data],
            metadata: createMetadata(correlationId),
            ...(error && {
                error: {
                    message: error.message,
                    code: error instanceof TrademarkError 
                        ? error.code 
                        : TrademarkErrorCode.UNKNOWN_ERROR,
                    details: error instanceof TrademarkError ? error.details : undefined
                }
            })
        };

        formatMetrics.inc({ status: error ? 'error' : 'success' });
        
        if (error) {
            logger.error({ error, correlationId }, 'Format error response');
        }

        return Object.freeze(response);
    } catch (err) {
        logger.error({ err, correlationId }, 'Formatter failed');
        throw err;
    }
}