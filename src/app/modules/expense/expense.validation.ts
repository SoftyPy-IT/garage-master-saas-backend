import { z } from 'zod';
import { stringOrArrayOrNumber } from '../../utils/type';

const expenseItemSchema = z.object({
  name: z.string().optional(),
  amount: z.number().optional(),
});

export const createExpenseValidationSchema = z.object({
  body: z.object({
    date: z.string().optional(),
    invoice_id: stringOrArrayOrNumber.optional(),
    invoiceCost: z.number().optional(),
    expense_items: z.array(expenseItemSchema).optional(),
    payment_method: z.string().optional(),
    accountNumber: z.string().optional(),
    transactionNumber: z.string().optional(),
    note: z.string().optional(),
    attachment: z.string().optional(),
  }),
});

export const createExpenseCategorySchema = z.object({
  body: z.object({
    name: z.string().optional(),
    code: z.string().optional(),
  }),
});

export const updateExpenseCategorySchema = z.object({
  body: z.object({
    name: z.string().optional(),
    code: z.string().optional(),
  }),
});
