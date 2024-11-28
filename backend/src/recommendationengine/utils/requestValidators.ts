import { Request } from 'express';
import { RecommendationError } from '../data/recommendationDAL';

export function validatePayloadSize(req: Request, maxSize: number): void {
    const size = parseInt(req.get('content-length') || '0', 10);
    if (size > maxSize) {
        throw new RecommendationError(`Payload size ${size} exceeds maximum ${maxSize} bytes`);
    }
}

export function sanitizeRequest(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== 'object') {
        throw new RecommendationError('Invalid request body');
    }
    
    // Deep clone and sanitize
    return JSON.parse(JSON.stringify(body));
}