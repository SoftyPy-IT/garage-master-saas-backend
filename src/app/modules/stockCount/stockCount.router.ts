import { Router } from 'express';
import { StockCountController } from './stockCount.controller';
import validateRequest from '../../middlewares/validateRequest';
import { createStockCountSchema } from './StockCount.validation';
import { upload } from '../../utils/cloudinary';

const router = Router();

router.get('/', StockCountController.getAllStockCount);
router.get('/:id', StockCountController.getStockCountById);
router.post('/', /* validateRequest(createStockSchema), */ StockCountController.createStockCount);
router.put('/:id', upload.single('file'), StockCountController.updateStockCount);
router.delete('/:id', StockCountController.deleteStockCount);

export const StockCountRoutes = router;
