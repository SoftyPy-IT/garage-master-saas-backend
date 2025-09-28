import * as z from 'zod';

export const createBarcodeSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'Barcode must have a name',
        invalid_type_error: 'Name must be a string',
      })
      .min(1, { message: 'Barcode must have a name' }),
    description: z
      .string({
        required_error: 'Barcode must have a description',
        invalid_type_error: 'Description must be a string',
      })
      .max(255, { message: 'Description must not exceed 255 characters' }),

    product_id: z
      .array(
        z.string({
          required_error: 'Please select a product',
          invalid_type_error: 'Product ID must be a string',
        }),
      )
      .optional(),
  }),
});
