// Global types

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface PaginationParams {
    page: number;
    limit: number;
}

// Express related request Types
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}