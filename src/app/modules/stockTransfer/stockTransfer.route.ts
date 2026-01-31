import express from 'express';
import { stockTransferControllers } from './stockTransfer.controller';
import validateRequest from '../../middlewares/validateRequest';
import { createStockTransactionZodSchema, updateStockTransactionZodSchema } from './stockTransfer.validation';
const router = express.Router();

// Add this POST route for creating stock transfers
router.post(
  '/',
  // validateRequest(createStockTransactionZodSchema),
  stockTransferControllers.createStockTransfer,
);

router.get(
  '/',
  stockTransferControllers.getAllStockTransfers,
);

router.delete(
  '/:id',
  validateRequest(updateStockTransactionZodSchema),
  stockTransferControllers.deleteStockTransfer,
);

router.put(
  '/:id',
 
  stockTransferControllers.updateStockTransfer,
);

export const stockTransferRoutes = router;