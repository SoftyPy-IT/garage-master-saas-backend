import express from 'express';
import { TenantControllers } from './tenant.controller';
const router = express.Router();

router.post('/', TenantControllers.createTenant);
router.get('/', TenantControllers.getAllTenant);
router.put('/:id', TenantControllers.updateTenant);
router.delete('/:id', TenantControllers.deleteTenant);
router.patch(
  '/renew-subscription/:id',TenantControllers.renewSubscription
);

export const teanentRoute = router;
