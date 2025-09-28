import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { WarehouseValidations } from './warehouse.validation';
import { warehouseControllers } from './warehouse.controller';

const router = express.Router();

router.post(
  '/',
  validateRequest(WarehouseValidations.createWarehouse),
  warehouseControllers.createWarehouse,
);

router.get('/', warehouseControllers.getAllWarehouses);

router.get('/:id', warehouseControllers.getSingleWarehouse);

router.delete('/:id', warehouseControllers.deleteWarehouse);

router.put(
  '/:id',
  validateRequest(WarehouseValidations.updateWarehouse),
  warehouseControllers.updateWarehouse,
);

export const warehouseRoutes = router;
