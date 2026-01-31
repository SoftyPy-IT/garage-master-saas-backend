import { z } from 'zod';

/**
 * Shared schema for product items
 */


const productSchema = z.object({
  productId: z.string({ required_error: 'Product ID is required' }),
  productName: z.string({ required_error: 'Product name is required' }),
  productUnit: z.string().optional(),
  quantity: z.union([z.number(), z.string()], {
    required_error: 'Quantity is required',
  }),
  unit_price: z.union([z.number(), z.string()], {
    required_error: 'Unit price is required',
  }),
  discount: z.union([z.number(), z.string()]).optional(),
  tax: z.union([z.number(), z.string()]).optional(),
  shipping: z.union([z.number(), z.string()]).optional(),
  subtotal: z.union([z.number(), z.string()]).optional(),
});

/**
 * Create Purchase Order Schema
 */
const createPurchaseOrder = z.object({
  body: z.object({
    orderDate: z.string({ required_error: 'Order date is required' }),
    expectedDeliveryDate: z.string().optional(),
    referenceNo: z.number({ required_error: 'Reference number is required' }),
    suppliers: z.array(z.string({ required_error: 'Supplier ID is required' })),
    warehouse: z.string({ required_error: 'Warehouse is required' }),
    status: z.enum(['Pending', 'Cancelled', 'Shipped','Received']).optional(),
    products: z
      .array(productSchema)
      .nonempty({ message: 'At least one product is required' }),
    shipping: z.union([z.number(), z.string()]).optional(),
    grandTotal: z.union([z.number(), z.string()]).optional(),
    paymentMethod: z.string().optional(),
    paymentStatus: z.enum(['Unpaid', 'Partial', 'Paid']).optional(),
    attachDocument: z.string().optional(),
    note: z.string().optional(),
  }),
});

 const updatePurchaseOrder = z.object({
  body: z.object({
    orderDate: z.string().optional(),
    expectedDeliveryDate: z.string().optional(),
    referenceNo: z.number().optional(),
    suppliers: z
      .array(z.string({ required_error: 'Supplier ID is required' }))
      .optional(),
    warehouse: z.string().optional(),
    status: z.enum(['Pending', 'Approved', 'Cancelled', 'Shipped','Received']).optional(),
    products: z
      .array(
        z.object({
          productId: z.string().optional(),
          productName: z.string().optional(),
          productUnit: z.string().optional(),
          quantity: z.union([z.number(), z.string()]).optional(),
          unit_price: z.union([z.number(), z.string()]).optional(),
          discount: z.union([z.number(), z.string()]).optional(),
          tax: z.union([z.number(), z.string()]).optional(),
          shipping: z.union([z.number(), z.string()]).optional(),
          subtotal: z.union([z.number(), z.string()]).optional(),
        }),
      )
      .optional(),
    shipping: z.union([z.number(), z.string()]).optional(),
    grandTotal: z.union([z.number(), z.string()]).optional(),
    paymentMethod: z.string().optional(),
    paymentStatus: z.enum(['Unpaid', 'Partial', 'Paid']).optional(),
    attachDocument: z.string().optional(),
    note: z.string().optional(),
  }),
});

export const PurchaseOrderValidations = {
  createPurchaseOrder,
  updatePurchaseOrder,
};
