import { z } from 'zod';

export const createStockTransactionZodSchema = z.object({
  body: z.object({
    warehouse: z.string({
      required_error: 'Warehouse is required',
    }),

    batchNumber: z.string().optional(),
    type: z.enum(['in', 'out'], {
      required_error: 'Transaction type is required',
    }),
    referenceType: z.string({
      required_error: 'Reference type is required',
    }),
    referenceId: z.string({
      required_error: 'Reference ID is required',
    }),
    sellingPrice: z.number().optional(),
    date: z.date().optional().default(new Date()),
  }),
});

export const updateStockTransactionZodSchema = z.object({
  body: z.object({
    quantity: z.number().positive().optional(),
    sellingPrice: z.number().optional(),
    note: z.string().optional(),
  }),
});

