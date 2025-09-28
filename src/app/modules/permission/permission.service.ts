// src/modules/permission/permission.service.ts
import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { IPermissionCheck, IPermissionMatrix, IPermissionRequest, IUserPermissions } from './permission.interface';
import AppError from '../../errors/AppError';
import Role from '../role/role.model';
import { User } from '../user/user.model';
import Page from '../page/page.model';

/**
 * Check if a user has permission for a specific action on a page
 */
const checkPermission = async (payload: IPermissionCheck): Promise<boolean> => {
  const { userId, pageId, action } = payload;

  // Get user with role
  const user = await User.findById(userId).populate('roleId');
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Superadmin has all permissions
  if (user.role === 'superadmin') {
    return true;
  }

  // Find the role
  const role = await Role.findById(user.roleId);
  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found');
  }

  // Check if the role has permission for the page and action
  const permission = role.permissions.find(
    p => p.pageId.toString() === pageId
  );

  if (!permission) {
    return false;
  }

  return permission[action] === true;
};

/**
 * Get all permissions for a user
 */
const getUserPermissions = async (userId: string): Promise<IUserPermissions> => {
  // Get user with role
  const user = await User.findById(userId).populate('roleId');
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Find the role
  const role = await Role.findById(user.roleId);
  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found');
  }

  
  // Get all pages
  const pages = await Page.find({ status: 'active' });

  // Create permission matrix
  const permissionMatrix: IPermissionMatrix = {};

  // If admin, grant all permissions
  if (role.type === 'admin' || user.role === 'superadmin') {
    pages.forEach(page => {
      permissionMatrix[page._id.toString()] = {
        create: true,
        edit: true,
        view: true,
        delete: true,
      };
    });
  } else {
    // For non-admin roles, use the defined permissions
    pages.forEach(page => {
      const pageId = page._id.toString();
      const permission = role.permissions.find(
        p => p.pageId.toString() === pageId
      );

      permissionMatrix[pageId] = {
        create: permission ? permission.create : false,
        edit: permission ? permission.edit : false,
        view: permission ? permission.view : false,
        delete: permission ? permission.delete : false,
      };
    });
  }

  return {
    userId,
    roleId: role._id.toString(),
    roleName: role.name,
    roleType: role.type,
    permissions: permissionMatrix,
  };
};

/**
 * Update permissions for a role
 */
const updateRolePermissions = async (
  roleId: string,
  permissions: IPermissionRequest[]
): Promise<void> => {
  // Check if the role exists
  const role = await Role.findById(roleId);
  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found');
  }

  // Validate all page IDs
  const pageIds = permissions.map(p => p.pageId);
  const pages = await Page.find({ _id: { $in: pageIds } });
  
  if (pages.length !== pageIds.length) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Some pages do not exist');
  }

  // Convert permissions to the format expected by the Role model
  const formattedPermissions = permissions.map(p => ({
    pageId: new Types.ObjectId(p.pageId),
    create: p.create,
    edit: p.edit,
    view: p.view,
    delete: p.delete,
  }));

  // Update the role
  await Role.findByIdAndUpdate(roleId, { permissions: formattedPermissions });
};

export const PermissionService = {
  checkPermission,
  getUserPermissions,
  updateRolePermissions,
};