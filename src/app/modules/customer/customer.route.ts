import express from 'express';
import { customerController } from './customer.controller';
import { auth } from '../../middlewares/auth';

const router = express.Router();

router
  .route('/')
  .post(auth('admin', 'superadmin'), customerController.createCustomer)
  .get(auth('admin', 'superadmin'), customerController.getAllCustomers);

router
  .route('/:id')
  .get(auth('admin', 'superadmin'), customerController.getSingleCustomerDetails)
  .put(auth('admin', 'superadmin'), customerController.updateCustomer)
  .delete(auth('admin', 'superadmin'), customerController.deleteCustomer);

router.patch(
  '/recycle/:id',
  auth('admin', 'superadmin'),
  customerController.moveToRecycledCustomer
);

router.patch(
  '/restore/:id',
  auth('admin', 'superadmin'),
  customerController.restoreFromRecycledCustomer
);

router.delete(
  '/delete-permanantly/:id',
  auth('admin', 'superadmin'),
  customerController.permanantlyDeleteCustomer
);

router.patch(
  '/recycle-all',
  auth('admin', 'superadmin'),
  customerController.moveAllToRecycledBinMoneyReceipts
);

router.patch(
  '/restore-all',
  auth('admin', 'superadmin'),
  customerController.restoreAllFromRecycledBinMoneyReceipts
);

export const CustomerRoutes = router;
