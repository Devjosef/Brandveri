import { Request } from 'express';
import { UserPreference } from '../../recommendationengine/types/recommendationEngine';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                preferences?: UserPreference;
            };
        }
    }
}