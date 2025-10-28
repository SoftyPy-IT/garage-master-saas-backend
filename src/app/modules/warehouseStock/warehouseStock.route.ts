import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { WarehouseStockValidations } from './warehouseStock.validation';
import { warehouseStockControllers } from './warehouseStock.controller';

const router = express.Router();

router.get('/', warehouseStockControllers.getAllWarehouseStocks);
router.post(
    '/',
    validateRequest(WarehouseStockValidations.createWarehouseStock),
    warehouseStockControllers.createWarehouseStock,
);

router.get('/:id', warehouseStockControllers.getSingleWarehouseStock);

router.put(
    '/:id',
    validateRequest(WarehouseStockValidations.updateWarehouseStock),
    warehouseStockControllers.updateWarehouseStock,
);

router.delete('/:id', warehouseStockControllers.deleteWarehouseStock);

export const warehouseStockRoutes = router;
