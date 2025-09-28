// src/modules/permission/permission.routes.ts
import express from 'express';
import { PermissionController } from './permission.controller';
import { auth } from '../../middlewares/auth';

const router = express.Router();

// Check permission
router.post(
  '/check',
  auth('admin', 'manager'),
  PermissionController.checkPermission
);

// Get user permissions
router.get(
  '/user/:userId',
  auth('admin', 'manager'),
  PermissionController.getUserPermissions
);

// Get current user's permissions
router.get(
  '/my-permissions',
  auth(),
  PermissionController.getMyPermissions
);

// Update role permissions
router.put(
  '/role/:roleId',
  auth('admin'),
  PermissionController.updateRolePermissions
);

export const PermissionRoutes = router;