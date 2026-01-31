import express from 'express';

import validateRequest from '../../middlewares/validateRequest';
import { supplierValidation } from './supplier.validation';
import { supplierController } from './supplier.controller';
import { auth } from '../../middlewares/auth';

const router = express.Router();

router
  .route('/')
  .post(
    validateRequest(supplierValidation.supplierValidationSchema),
  auth('admin', 'superadmin'),
    supplierController.createSupplier,
  )
  .get(supplierController.getAllSupplier);

// Add the profile route separately - this is the correct way
router.get('/:id/profile',  auth('admin', 'superadmin'), supplierController.getSupplierProfile);

router
  .route('/:id')
  
  .get(supplierController.getSingleSupplier)
  .put(supplierController.updateSupplier);

router
  .route('/recycle/:id')
  .patch(supplierController.moveToRecycledbinSupplier);

router
  .route('/restore/:id')
  .patch(supplierController.restoreFromRecycledSupplier);

router
  .route('/delete-permenantly/:id')
  .delete(supplierController.permanentlyDeleteSupplier);
router.post(
  '/payments',                            
  supplierController.recordSupplierPayment
);

router.get(
  '/:supplierId/payments',supplierController.getSupplierPayments
  
);

router.post('/:supplierId/recalc-totals', supplierController.recalcSupplierTotals);


export const SupplierRoutes = router;  
