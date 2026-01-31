import { z } from 'zod';

const createWarehouseStock = z.object({
    body: z.object({
        tenantDomain: z.string(),
        warehouse: z.string({ required_error: 'Warehouse ID is required' }),
        product: z.string({ required_error: 'Product ID is required' }),
        quantity: z.number().nonnegative().default(0),
    }),
});

const updateWarehouseStock = z.object({
    body: z.object({
        tenantDomain: z.string().optional(),
        warehouse: z.string().optional(),
        product: z.string().optional(),
        quantity: z.number().nonnegative().optional(),
    }),
});

export const WarehouseStockValidations = {
    createWarehouseStock,
    updateWarehouseStock,
};
