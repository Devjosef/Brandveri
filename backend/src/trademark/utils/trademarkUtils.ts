import { 
    Trademark, 
    TrademarkSearchParams, 
    TrademarkErrorCode,
    TrademarkStatus,
    TrademarkClass,
    BaseResponse,
    NiceClassification
  } from '../../../types/trademark';
  import { Counter, Histogram } from 'prom-client';
  import crypto from 'crypto';
  import { z } from 'zod';

// Utility-specific metrics with more granular tracking using prom
const utilMetrics = {
  operations: new Counter({
    name: 'trademark_utils_operations_total',
    help: 'Total number of trademark utility operations',
    labelNames: ['operation', 'status', 'type']
  }),
  formatDuration: new Histogram({
    name: 'trademark_format_duration_seconds',
    help: 'Duration of trademark formatting operations',
    buckets: [0.01, 0.05, 0.1, 0.5]
  }),
  validationErrors: new Counter({
    name: 'trademark_validation_errors_total',
    help: 'Total number of trademark validation errors',
    labelNames: ['field', 'error_type']
  })
};

// Zod schema for trademark validation
const trademarkSchema = z.object({
  id: z.number(),
  name: z.string().min(3).max(255),
  owner: z.object({
    name: z.string().min(2),
    address: z.string().min(5),
    type: z.enum(['individual', 'company'])
  }),
  registrationNumber: z.string().optional(),
  registrationDate: z.date(),
  expirationDate: z.date().optional(),
  status: z.nativeEnum(TrademarkStatus),
  classes: z.array(z.nativeEnum(TrademarkClass)),
  niceClasses: z.array(z.nativeEnum(NiceClassification)),
  classDescriptions: z.record(z.string()).optional(),
  description: z.string(),
  logo: z.string().url().optional(),
  jurisdiction: z.string(),
  priority: z.object({
    date: z.date(),
    country: z.string(),
    applicationNumber: z.string()
  }).optional(),
  metadata: z.any().optional(),
  created_at: z.date(),
  updated_at: z.date()
});

/**
 * Represents the formatted response for trademark operations
 * @interface FormattedTrademarkResponse
 * @extends BaseResponse
 * @version 1.0.0
 * 
 * @property {string} id - Unique identifier of the trademark
 * @property {string} name - Name of the trademark
 * @property {Object} owner - Owner information of the trademark
 * @property {TrademarkStatus} status - Current status of the trademark
 * @property {TrademarkClass[]} classes - Associated trademark classifications
 * @property {Object} metadata - Additional metadata and tracking information
 * @throws {TrademarkError} When validation or processing fails
 */
interface FormattedTrademarkResponse extends BaseResponse {
  readonly id: string;
  readonly name: string;
  readonly owner: {
    readonly name: string;
    readonly address: string;
    readonly type: 'individual' | 'company';
  };
  readonly status: TrademarkStatus;
  readonly classes: readonly TrademarkClass[];
  readonly metadata: {
    readonly requestId: string;
    readonly timestamp: Date;
    readonly jurisdiction?: readonly string[];
    readonly correlationId?: string;
    readonly version: string;
  };
}

export function formatTrademarkResponse(
  data: Readonly<Trademark>, 
  correlationId?: string
): FormattedTrademarkResponse {
  const timer = utilMetrics.formatDuration.startTimer();
  const API_VERSION = '1.0.0';
  
  try {
    const validatedData = validateTrademarkData(data);
    
    const formatted: FormattedTrademarkResponse = {
      success: true,
      version: API_VERSION,
      id: validatedData.id.toString(),
      name: validatedData.name,
      owner: Object.freeze({...validatedData.owner}),
      status: validatedData.status,
      classes: Object.freeze([...validatedData.classes]),
      metadata: Object.freeze({
        requestId: crypto.randomUUID(),
        timestamp: new Date(),
        jurisdiction: [validatedData.jurisdiction],
        correlationId,
        version: API_VERSION
      })
    };

    utilMetrics.operations.inc({ 
      operation: 'format', 
      status: 'success',
      type: 'response'
    });
    
    return Object.freeze(formatted);
  } catch (error) {
    const errorResponse = createErrorResponse(error, API_VERSION);
    utilMetrics.operations.inc({ 
      operation: 'format', 
      status: 'error',
      type: errorResponse.error.code
    });
    return errorResponse;
  } finally {
    timer();
  }
}

export function validateTrademarkData(data: unknown): Trademark {
  try {
    return trademarkSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        utilMetrics.validationErrors.inc({
          field: err.path.join('.'),
          error_type: err.code
        });
      });
      
      throw {
        code: TrademarkErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: {
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        }
      };
    }
    throw error;
  }
}

export function generateSearchCacheKey(params: TrademarkSearchParams): string {
  const normalized = {
    ...params,
    query: params.query.toLowerCase().trim(),
    timestamp: Math.floor(Date.now() / (1000 * 60 * 15)) // 15-minute segments
  };
  
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex');
    
  return `trademark:search:${hash}`;
}

export function sanitizeSearchParams(
  params: Partial<TrademarkSearchParams>
): TrademarkSearchParams {
  const sanitized = {
    query: params.query?.trim().toLowerCase() ?? '',
    page: Math.max(1, params.page ?? 1),
    limit: Math.min(100, Math.max(1, params.limit ?? 10)),
    jurisdiction: params.jurisdiction?.filter(j => ['USPTO', 'EUIPO'].includes(j)),
    niceClasses: params.niceClasses?.filter(c => c >= 1 && c <= 45)
  };

  utilMetrics.operations.inc({ 
    operation: 'sanitize', 
    status: 'success',
    type: 'params'
  });

  return sanitized;
}

export function logTrademarkOperation(
  operation: string,
  data: Record<string, unknown>,
  status: 'success' | 'error' = 'success',
  correlationId?: string
): void {
  utilMetrics.operations.inc({ operation, status, type: 'operation' });
  
  const logData = {
    operation,
    data,
    correlationId,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  };

  if (status === 'error') {
    console.error('Trademark operation failed:', logData);
  } else if (process.env.NODE_ENV === 'development') {
    console.debug('Trademark operation:', logData);
  }
}