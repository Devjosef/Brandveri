import { Trademark, TrademarkResponse, TrademarkErrorCode } from '../../../types/trademark';
import { Counter } from 'prom-client';
import { config } from '../utils/validation';
import { loggers } from '../../../observability/contextLoggers';
import { RequestContext } from '../../utils/requestContext';
import { TrademarkError } from './trademarkError';

const logger = loggers.trademark;

/**
 * Only a single metric to.
 * - Only tracks success/failure states,
 * - Reduces monitoring overhead.
 */
const responseMetric = new Counter({
    name: 'trademark_responses_total',
    help: 'Total responses by status',
    labelNames: ['status']
});

export function formatTrademarkResponse(
    data: Readonly<Trademark | Trademark[]>,
    error?: TrademarkError | Error
): Readonly<TrademarkResponse> {
    const context = RequestContext.getCurrentContext();
    const correlationId = context?.correlationId || crypto.randomUUID();
    
    try {
        const response = Object.freeze({
            success: !error,
            version: config.TRADEMARK.VERSION,
            data: Array.isArray(data) ? [...data] : [data],
            metadata: {
                requestId: correlationId,
                timestamp: new Date(),
                path: '/api/trademark',
                correlationId
            },
            ...(error && {
                error: {
                    message: error.message,
                    code: error instanceof TrademarkError 
                        ? error.code 
                        : TrademarkErrorCode.UNKNOWN_ERROR
                }
            })
        });

        responseMetric.inc({ status: error ? 'error' : 'success' });
        error && logger.error({ error, correlationId }, 'Format error response');

        return response;
    } catch (err) {
        logger.error({ err, correlationId }, 'Formatter failed');
        throw err;
    }
}