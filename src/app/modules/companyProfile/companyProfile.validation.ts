// validations/companyProfileValidation.ts
import { z } from 'zod';

export const createCompanyProfileSchema = z.object({
  body: z.object({
    companyName: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    website: z.string().optional(),
    address: z.string().optional(),
    description: z.string().optional(),
  }),
});
