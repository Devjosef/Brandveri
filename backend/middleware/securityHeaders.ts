import { Request, Response, NextFunction } from 'express';
import { Config } from './index';
import { Counter } from 'prom-client';
import crypto from 'crypto';

// Metrics for CSP violations
const cspViolations = new Counter({
  name: 'csp_violations_total',
  help: 'Total number of CSP violations',
  labelNames: ['directive']
});

// CSP violation report handler
export const handleCSPViolation = (req: Request, res: Response): void => {
  const violation = req.body;
  cspViolations.inc({
    directive: violation['violated-directive']
  });
  res.status(204).end();
};

// Helper function to format CSP header
const formatCSPHeader = (directives: Record<string, string[]>): string => {
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
};

// Generate nonce using crypto
const generateNonce = (): string => {
  return crypto.randomBytes(16).toString('base64');
};

export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  const nonce = generateNonce();
  res.locals.nonce = nonce;

  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'strict-dynamic'",
      `'nonce-${nonce}'`
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", Config.API_URL],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'report-uri': ['/api/csp-report']
  };

  // Security Headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', formatCSPHeader(cspDirectives));
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), accelerometer=()');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};