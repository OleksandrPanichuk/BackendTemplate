import { z } from 'zod';
import { isStrongPassword } from 'class-validator';

export const localStrategyPayloadSchema = z.object({
  email: z.email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .refine((val) => isStrongPassword(val)),
});
