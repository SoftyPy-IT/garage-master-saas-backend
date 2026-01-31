import express from 'express';
import { vehicleController } from './vehicle.controller';
import validateRequest from '../../middlewares/validateRequest';
import { vehicleValidation } from './vehicle.validation';

const router = express.Router();

router
  .route('/')
  .post(
    validateRequest(vehicleValidation.vehicleValidationSchema),
    vehicleController.createVehicle,
  )
  .get(vehicleController.getAllVehicles);

router
  .route('/:id')
  .get(vehicleController.getSingleVehicle)
  .delete(vehicleController.deleteVehicle)
  .patch(vehicleController.updateVehicle);

export const VehicleRoutes = router;
