// src/modules/page/page.validation.ts
import { z } from 'zod';
                   
export const createPageZodSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Page name is required',
    }),
    category: z.string().optional(),
    path: z.string({
      required_error: 'Path is required',
    }),
    route: z.string({
      required_error: 'Route is required',
    }),
    description: z.string().optional(),
    status: z.string().optional(),
  }),
});                        
export const updatePageZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    category: z.string().optional(),
    path: z.string().optional(),
    route: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
  }),
  params: z.object({
    id: z.string({
      required_error: 'Page ID is required',
    }),
  }),
});