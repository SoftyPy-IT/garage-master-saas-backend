// src/modules/permission/permission.routes.ts
import { Router } from 'express';
import { PermissionController } from './permission.controller';
import { auth } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { batchCreatePermissionSchema, checkPermissionZodSchema, permissionRequestSchema } from './permission.validation';
const router = Router();


router.get(
  '/my-permissions',
  auth('admin', 'superadmin', 'manager', 'user'),
  PermissionController.getMyPermissions
);

router.get(
  '/user/:userId',
  auth('admin', 'superadmin'),
  PermissionController.getUserPermissions
);

router.get(
  '/single/:id',
  auth('admin', 'superadmin'),
  PermissionController.getSinglePermission
);

router.post(
  '/:userId',
  auth('admin', 'superadmin'),
  validateRequest(permissionRequestSchema),
  PermissionController.createUserPermission
);

router.put(
  '/:userId/:id',
  auth('admin', 'superadmin'),
  validateRequest(permissionRequestSchema),
  PermissionController.updateRolePermissions
);
router.delete('/:id', PermissionController.deleteUserPermission)
router.patch(
  '/batch-update',
  auth('admin', 'superadmin'),
  PermissionController.updateMultiplePermissions,
);
router.post(
  '/batch-create',
  auth('admin', 'superadmin'),
  validateRequest(batchCreatePermissionSchema),
  PermissionController.createMultiplePermissions,
);





export const permissionRouters = router;
