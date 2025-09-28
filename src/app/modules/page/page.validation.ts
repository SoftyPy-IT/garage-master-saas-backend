import { z } from 'zod';

// Schema for creating a page
const createPageZodSchema = {
  body: z.object({
    name: z.string({
      required_error: 'Page name is required',
    }),
    category: z.string({
      required_error: 'Category is required',
    }),
    path: z.string({
      required_error: 'Path is required',
    }),
    description: z.string().optional(),
    status: z.enum(['active', 'inactive']).default('active'),
  }),
};

// Schema for updating a page
const updatePageZodSchema = {
  body: z.object({
    name: z.string().optional(),
    category: z.string().optional(),
    path: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
  params: z.object({
    id: z.string({
      required_error: 'Page ID is required',
    }),
  }),
};

export const PageValidation = {
  createPageZodSchema,
  updatePageZodSchema,
};