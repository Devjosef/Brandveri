import { z } from 'zod';
import { AuthError } from '../../../auth/utils/AuthError';

const CopyrightRegistrationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  author: z.string().min(1, 'Author is required').max(255),
  registration_number: z.string().min(1, 'Registration number is required'),
  registration_date: z.string().transform(str => new Date(str)),
  status: z.string().optional(),
  country: z.string().optional()
}).strict();

export const validateCopyrightRegistration = async (data: unknown) => {
  try {
    return await CopyrightRegistrationSchema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AuthError(
        400,
        error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }
    throw error;
  }
};