
import { Router } from 'express';
import { PermissionController } from './permission.controller';
import validateRequest from '../../middlewares/validateRequest';
import { deleteMultiplePermissionsSchema, permissionRequestSchema } from './permission.validation';
const router = Router();


router.post(
  '/batch-create',
  // validateRequest(multiplePermission),
  PermissionController.createMultiplePermissions,
);
router.delete(
  '/user/:userId/:id',
  PermissionController.deleteUserPermission
);

// Multiple permissions delete
router.delete(
  '/user/:userId/batch',
  validateRequest(deleteMultiplePermissionsSchema),
  PermissionController.deleteMultipleUserPermissions
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
  '/user-permissions',
  PermissionController.getAllPermissions
);

router.get(
  '/user/:userId',

  PermissionController.getUserPermissions
);

router.get(
  '/single/:id',
  PermissionController.getSinglePermission
);

router.delete('/:id', PermissionController.deleteMultipleUserPermissions)
router.patch(
  '/batch-update',
  PermissionController.updateMultiplePermissions,
);






export const permissionRouters = router;
