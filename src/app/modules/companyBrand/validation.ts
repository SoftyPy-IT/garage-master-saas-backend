import { z } from 'zod';

const createCompanyBrandValidation = z.object({
  body: z.object({
    logo: z.string().optional(),
  }),
});

const updateCompanyBrandValidation = z.object({
  body: z.object({
    logo: z.string().optional(),
  }),
});

export const CompanyBrandValidations = {
  createCompanyBrandValidation,
  updateCompanyBrandValidation,
};
