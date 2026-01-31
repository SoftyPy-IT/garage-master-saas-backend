import { z } from 'zod';

export const createDonationValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    mobile_number: z.string().optional(),
    email: z.string().optional(),
    donation_country: z.string().optional(),
    address: z.string().optional(),
    donation_purpose: z.string().optional(),
    donation_amount: z.number().optional(),
    payment_method: z.string().optional(),
    bank_account_no: z.string().optional(),
    check_no: z.string().optional(),
    card_number: z.string().optional(),
    card_holder_name: z.string().optional(),
    card_transaction_no: z.string().optional(),
    card_type: z.string().optional(),
    month_first: z.string().optional(),
    month_second: z.string().optional(),
    year: z.string().optional(),
    security_code: z.string().optional(),


    transaction_no: z.string().optional(),
    transactionId: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const DonationValidations = {
  createDonationValidationSchema,
};
