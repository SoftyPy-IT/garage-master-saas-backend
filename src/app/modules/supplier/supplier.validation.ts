import { z } from 'zod';

const supplierValidationSchema = z.object({
  body: z.object({
    full_name: z.string({ required_error: 'Supplier name is required.' }),
    contact_person_name: z.string({
      required_error: 'Contact person name is required.',
    }),
    country_code: z.string().optional(),
    phone_number: z.string().optional(),
    email: z.string().optional(),
    tax_id: z.string().optional(),
    street_address: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
    bank_name: z.string().optional(),
    account_number: z.string().optional(),
    swift_code: z.string().optional(),
    supplier_status: z
      .union([z.enum(['active', 'inactive']), z.literal('')])
      .optional()
      .default('active'),

    notes: z.string().optional(),
  }),
});

const recordPaymentSchema = z
  .object({
    supplierId: z.string().min(1, 'Supplier ID is required'),
    amount: z.number().positive('Amount must be a positive number'),
    method: z.enum([
      'Cash',
      'Bkash',
      'Nagad',
      'Rocket',
      'Check',
      'Card',
      'Bank Transfer',
      'Other',
    ]),
    transactionId: z.string().optional(),
    accountNumber: z.string().optional(),

    // Card specific fields
    cardNumber: z.string().optional(),
    cardHolder: z.string().optional(),
    expiryDate: z.string().optional(),
    cvv: z.string().optional(),

    // Check specific fields
    checkNumber: z.string().optional(),
    bankName: z.string().optional(),

    // Mobile wallet fields (Bkash, Nagad, Rocket)
    mobileNumber: z.string().optional(),

    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Card validations
    if (data.method === 'Card') {
      if (!data.cardNumber) {
        ctx.addIssue({
          code: 'custom',
          path: ['cardNumber'],
          message: 'Card number is required for Card payments',
        });
      }
      if (!data.cardHolder) {
        ctx.addIssue({
          code: 'custom',
          path: ['cardHolder'],
          message: 'Card holder is required for Card payments',
        });
      }
      if (
        !data.expiryDate ||
        !/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(data.expiryDate)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['expiryDate'],
          message: 'Expiry date must be in MM/YY format',
        });
      }
      if (!data.cvv || !/^[0-9]{3,4}$/.test(data.cvv)) {
        ctx.addIssue({
          code: 'custom',
          path: ['cvv'],
          message: 'CVV must be 3 or 4 digits',
        });
      }
    }

    // Check validations
    if (data.method === 'Check') {
      if (!data.checkNumber) {
        ctx.addIssue({
          code: 'custom',
          path: ['checkNumber'],
          message: 'Check number is required for Check payments',
        });
      }
      if (!data.bankName) {
        ctx.addIssue({
          code: 'custom',
          path: ['bankName'],
          message: 'Bank name is required for Check payments',
        });
      }
    }

    // Mobile wallet validations
    if (['Bkash', 'Nagad', 'Rocket'].includes(data.method)) {
      if (!data.mobileNumber || !/^01[3-9]\d{8}$/.test(data.mobileNumber)) {
        ctx.addIssue({
          code: 'custom',
          path: ['mobileNumber'],
          message: 'A valid Bangladeshi mobile number is required',
        });
      }
    }
  });

export const supplierValidation = {
  supplierValidationSchema,
  recordPaymentSchema,
};
