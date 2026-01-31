import express from 'express';
import { customerController } from './customer.controller';
import { auth } from '../../middlewares/auth';
import { checkPermission } from '../../middlewares/checkPermission';

const router = express.Router();

router.post(
  '/',
  customerController.createCustomer
);

router.get(
  '/',
  customerController.getAllCustomers
);

router.get(
  '/:id',
  customerController.getSingleCustomerDetails
);

router.put(
  '/:id',
  customerController.updateCustomer
);

router.delete(
  '/:id',
  customerController.deleteCustomer
);
router.patch(
  '/recycle/:id',
  customerController.moveToRecycledCustomer
);

router.patch(
  '/restore/:id',
  customerController.restoreFromRecycledCustomer
);

router.delete(
  '/delete-permanantly/:id',
  // auth('admin', 'superadmin'),
  // checkPermission('/dashboard/customer-list', 'delete'),
  customerController.permanantlyDeleteCustomer
);

router.patch(
  '/recycle-all',
  customerController.moveAllToRecycledBinMoneyReceipts
);

router.patch(
  '/restore-all',
  customerController.restoreAllFromRecycledBinMoneyReceipts
);

export const CustomerRoutes = router;