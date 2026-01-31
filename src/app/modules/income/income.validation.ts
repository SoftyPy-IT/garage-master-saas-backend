import { z } from "zod";
import { stringOrArrayOrNumber } from "../../utils/type";

const incomeItemSchema = z.object({
  name: z.string(),
  amount: z.number(),
});

export const createIncomeValidationSchema = z.object({
  body: z.object({
    date: z.string().optional(),
    income_items: z.array(incomeItemSchema).optional(),
    payment_method: stringOrArrayOrNumber.optional(),
    accountNumber: stringOrArrayOrNumber.optional(),
    transactionNumber: stringOrArrayOrNumber.optional(),
    note: stringOrArrayOrNumber.optional(),
  }),
});
