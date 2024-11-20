import { Request, Response, NextFunction } from 'express';
import { loggers } from '../observability/contextLoggers';
import { Counter, Histogram } from 'prom-client';

const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const requestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime();
  const logger = loggers.api;

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;

    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      requestId: req.id,
      userAgent: req.get('user-agent'),
      ip: req.ip
    };

    requestDuration.observe(
      { method: req.method, route: req.route?.path || 'unknown', status_code: res.statusCode },
      duration
    );

    requestCounter.inc({
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode
    });

    if (res.statusCode >= 400) {
      logger.error(logData, 'Request failed');
    } else {
      logger.info(logData, 'Request completed');
    }
  });

  next();
};