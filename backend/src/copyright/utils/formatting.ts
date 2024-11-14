import { AuthError } from '../../../auth/utils/AuthError';
import { Counter } from 'prom-client';

// Metrics for formatting operations
const formattingMetrics = new Counter({
  name: 'formatting_operations_total',
  help: 'Total number of formatting operations',
  labelNames: ['operation', 'status']
});

interface CopyrightData {
  id: number;
  title: string;
  owner: string;
  registrationDate?: Date;
  [key: string]: any;
}

interface FormattedCopyrightData {
  id: number;
  title: string;
  owner: string;
  registrationDate?: string;
  [key: string]: any;
}

export const formatDate = (date: string | Date | undefined): string => {
  try {
    formattingMetrics.inc({ operation: 'formatDate', status: 'attempt' });
    if (!date) {
      throw new AuthError(400, 'Invalid date provided', 'VALIDATION_ERROR');
    }
    const formattedDate = new Date(date).toLocaleDateString();
    if (formattedDate === 'Invalid Date') {
      throw new AuthError(400, 'Invalid date format', 'VALIDATION_ERROR');
    }
    formattingMetrics.inc({ operation: 'formatDate', status: 'success' });
    return formattedDate;
  } catch (error) {
    formattingMetrics.inc({ operation: 'formatDate', status: 'error' });
    if (error instanceof AuthError) throw error;
    throw new AuthError(500, 'Date formatting failed', 'FORMATTING_ERROR');
  }
};

export function formatCopyrightResponse(data: CopyrightData): FormattedCopyrightData {
  try {
    formattingMetrics.inc({ operation: 'formatCopyright', status: 'attempt' });
    
    if (!data || typeof data !== 'object') {
      throw new AuthError(400, 'Invalid copyright data', 'VALIDATION_ERROR');
    }

    const formatted: FormattedCopyrightData = {
      id: data.id,
      title: data.title?.trim() || '',
      owner: data.owner?.trim() || '',
      registrationDate: data.registrationDate ? formatDate(data.registrationDate) : undefined
    };

    formattingMetrics.inc({ operation: 'formatCopyright', status: 'success' });
    return formatted;
  } catch (error) {
    formattingMetrics.inc({ operation: 'formatCopyright', status: 'error' });
    if (error instanceof AuthError) throw error;
    throw new AuthError(500, 'Copyright formatting failed', 'FORMATTING_ERROR');
  }
}
