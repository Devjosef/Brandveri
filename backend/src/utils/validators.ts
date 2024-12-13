import { Request } from 'express';

export class DataValidator {
    static validateSize(data: string | Buffer, maxSize: number): void {
        const size = Buffer.byteLength(data);
        if (size <= 0 || size > maxSize) {
            throw new Error(`Invalid data size: ${size} bytes`);
        }
    }
}

export class RequestValidator {
    static validatePayloadSize(req: Request, maxSize: number): void {
        const size = parseInt(req.get('content-length') || '0', 10);
        if (size <= 0 || size > maxSize) {
            throw new Error(`Invalid payload size: ${size} bytes`);
        }
    }
}