import express from 'express';
import { customerController } from './customer.controller';

const router = express.Router();

router
  .route('/')
  .post(customerController.createCustomer)
  .get(customerController.getAllCustomers);

router
  .route('/:id')
  .get(customerController.getSingleCustomerDetails)
  .put(customerController.updateCustomer)
  .delete(customerController.deleteCustomer);
router.route('/recycle/:id').patch(customerController.moveToRecycledCustomer);
router
  .route('/restore/:id')
  .patch(customerController.restoreFromRecycledCustomer);
router
  .route('/delete-permanantly/:id')
  .delete(customerController.permanantlyDeleteCustomer);

      router.patch('/recycle-all', customerController.moveAllToRecycledBinMoneyReceipts);
      router.patch('/restore-all', customerController.restoreAllFromRecycledBinMoneyReceipts);

export const CustomerRoutes = router;
