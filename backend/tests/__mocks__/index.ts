import { authMock } from './auth';
import { cacheMock } from './cache';
import { dbMock } from './database';
import { loggerMock } from './logger';
import { metricsMock } from './metrics';
import { paymentGatewayMock } from './payment';
import { usptoMock, euipoMock } from './trademark';

// Infrastructure mocks
export { 
  createDatabaseMock,
  dbMock 
} from './database';

export { 
  createCacheMock,
  cacheMock 
} from './cache';

// External service mocks
export { 
  createUSPTOMock,
  createEUIPOMock,
  usptoMock,
  euipoMock 
} from './trademark';

export { 
  createPaymentGatewayMock,
  paymentGatewayMock 
} from './payment';

// Provider mocks
export { 
  createAuthMock,
  createAuthMockWithRole,
  authMock 
} from './auth';

// Observability mocks
export { 
  createMetricsMock,
  metricsMock 
} from './metrics';

export { 
  createLoggerMock,
  loggerMock 
} from './logger';

// Types
export type * from './types/infrastructure';
export type * from './types/paymentTypes';
export type * from './types/authTypes';
export type * from './types/metricsTypes';
export type * from './types/loggerTypes';

// Default mocks object for easy access
export const mocks = {
  // Infrastructure
  db: dbMock,
  cache: cacheMock,
  
  // External services
  uspto: usptoMock,
  euipo: euipoMock,
  payment: paymentGatewayMock,
  
  // Providers
  auth: authMock,
  
  // Observability
  metrics: metricsMock,
  logger: loggerMock
} as const;