import { z } from 'zod';

export const createWarrantyValidation = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    duration: z.number().optional(),
    durationType: z.string().optional(),
    terms: z.string().optional(),
    tenantDomain: z.string().optional(),
  }),
});

export const updateWarrantyValidation = createWarrantyValidation.partial();
