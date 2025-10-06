// src/modules/permission/permission.routes.ts
import { Router } from 'express';
import { PermissionController } from './permission.controller';
import { auth } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { checkPermissionZodSchema, permissionRequestSchema } from './permission.validation';
const router = Router();

router.get(
  '/user/:userId',
  auth('admin', 'superadmin'),
  PermissionController.getUserPermissions
);

router.post(
  '/:userId',
  auth('admin', 'superadmin'),
  validateRequest(permissionRequestSchema),
  PermissionController.createUserPermission
);

router.put(
  '/role/:roleId',
  auth('admin', 'superadmin'),
  validateRequest(permissionRequestSchema),
  PermissionController.updateRolePermissions
);

router.post(
  '/check',
  auth('admin', 'superadmin'),
  validateRequest(checkPermissionZodSchema),
  PermissionController.checkPermission
);

router.get(
  '/my-permissions',
  auth('admin', 'superadmin', 'manager', 'user'),
  PermissionController.getMyPermissions
);

export const permissionRouters = router;
