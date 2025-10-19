
import { Router } from 'express';
import { PermissionController } from './permission.controller';
import validateRequest from '../../middlewares/validateRequest';
import { permissionRequestSchema } from './permission.validation';
const router = Router();


router.post(
  '/batch-create',
  PermissionController.createMultiplePermissions,
);
router.post(
  '/:userId',
  validateRequest(permissionRequestSchema),
  PermissionController.createUserPermission
);

router.get(
  '/my-permissions',
  PermissionController.getMyPermissions
);

router.get(
  '/user/:userId',

  PermissionController.getUserPermissions
);

router.get(
  '/single/:id',
  PermissionController.getSinglePermission
);


router.put(
  '/:userId/:id',

  validateRequest(permissionRequestSchema),
  PermissionController.updateRolePermissions
);
router.delete('/:id', PermissionController.deleteUserPermission)
router.patch(
  '/batch-update',
  PermissionController.updateMultiplePermissions,
);






export const permissionRouters = router;
