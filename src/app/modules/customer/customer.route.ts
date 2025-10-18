import express from 'express';
import { customerController } from './customer.controller';
import { auth } from '../../middlewares/auth';
import { checkPermission } from '../../middlewares/checkPermission';

const router = express.Router();

router.post(
  '/',
  auth('admin', 'superadmin'),
  checkPermission('/dashboard/add-customer', 'create'),
  customerController.createCustomer
);

router.get(
  '/',
  auth('admin', 'superadmin'),
  checkPermission('/dashboard/customer-list', 'view'),
  customerController.getAllCustomers
);

router.get(
  '/:id',
  auth('admin', 'superadmin'),
  checkPermission('/dashboard/customer-list', 'view'),
  customerController.getSingleCustomerDetails
);

router.put(
  '/:id',
  auth('admin', 'superadmin'),
  checkPermission('/dashboard/update-customer', 'edit'),
  customerController.updateCustomer
);

router.delete(
  '/:id',
  auth('admin', 'superadmin'),
  checkPermission('/dashboard/customer-list', 'delete'),
  customerController.deleteCustomer
);
router.patch(
  '/recycle/:id',
  auth('admin', 'superadmin'),
  checkPermission('/dashboard/customer-list', 'delete'),
  customerController.moveToRecycledCustomer
);

router.patch(
  '/restore/:id',
  auth('admin', 'superadmin'),
  checkPermission('/dashboard/customer-list', 'edit'),
  customerController.restoreFromRecycledCustomer
);

router.delete(
  '/delete-permanantly/:id',
  auth('admin', 'superadmin'),
  checkPermission('/dashboard/customer-list', 'delete'),
  customerController.permanantlyDeleteCustomer
);

router.patch(
  '/recycle-all',
  auth('admin', 'superadmin'),
  checkPermission('/dashboard/customer-list', 'delete'),
  customerController.moveAllToRecycledBinMoneyReceipts
);

router.patch(
  '/restore-all',
  auth('admin', 'superadmin'),
  checkPermission('/dashboard/customer-list', 'edit'),
  customerController.restoreAllFromRecycledBinMoneyReceipts
);

export const CustomerRoutes = router;