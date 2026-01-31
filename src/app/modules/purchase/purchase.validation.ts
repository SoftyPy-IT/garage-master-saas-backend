import { z } from 'zod';

// Product Schema Validation
const productSchema = z.object({
  productId: z.string({ required_error: 'Product ID is required' }),
  productName: z.string({ required_error: 'Product name is required' }),
  productUnit: z.string({ required_error: 'Product unit is required' }),
  discount: z.union([z.number(), z.string()]),
  productPrice: z.union([z.number(), z.string()]),
  tax: z.union([z.number(), z.string()]),
  quantity: z.union([z.number(), z.string()]),
  serialNumber: z.string().optional(),
});

// Create Purchase Validation Schema
const createPurchase = z.object({
  body: z.object({
    date: z.string().optional(),
    referenceNo: z.string().optional(),

    attachDocument: z.string().optional(),
    suppliers: z.array(z.string({ required_error: 'Supplier ID is required' })),
    warehouse: z.array(
      z.string({ required_error: 'warehouse ID is required' }),
    ),
    shipping: z.number().optional(),
    paymentMethod: z.string().optional(),
    purchaseStatus: z.string().optional(),
    products: z
      .array(productSchema)
      .nonempty({ message: 'At least one product is required' }),
  }),
});

// Update Purchase Validation Schema
const updatePurchase = z.object({
  body: z.object({
    date: z.string().optional(),
    referenceNo: z.string().optional(),
    warehouse: z.array(z.string()).optional(),
    attachDocument: z.string().optional(),
    supplier: z.string().optional(),
    shipping: z.string().optional(),
    paymentMethod: z.string().optional(),
    purchaseStatus: z.string().optional(),
    products: z.array(productSchema).optional(),
  }),
});

export const PurchaseValidations = {
  createPurchase,
  updatePurchase,
};
