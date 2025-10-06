// src/modules/permission/permission.service.ts
import httpStatus from 'http-status';
import mongoose, { Types } from 'mongoose';
import {
  IPermission,
  IPermissionRequest,
  IPermissionCheck,
} from './permission.interface';
import AppError from '../../errors/AppError';
import { getTenantModel } from '../../utils/getTenantModels';

export const getUserPermissions = async (
  tenantDomain: string,
  userId: string,
) => {
  const { Model: Permission } = await getTenantModel(
    tenantDomain,
    'Permission',
  );
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  // Get all permissions for this user
  const userPermissions = await Permission.find({
    userId: new Types.ObjectId(userId),
  })
    .populate('roleId')
    .populate('pageId');

  // Get role-based permissions
  const roleIds = user.roleId.map((role: any) => role._id);
  const rolePermissions = await Permission.find({
    roleId: { $in: roleIds },
    userId: { $ne: new Types.ObjectId(userId) },
  })
    .populate('roleId')
    .populate('pageId');

  // Combine and remove duplicates
  const allPermissions = [...userPermissions, ...rolePermissions];

  // Map permissions by page, skip if pageId missing
const permissionMap = new Map<string, any>();
allPermissions.forEach((permission) => {
  if (!permission.pageId || !permission.pageId.length) return; // skip empty array

  permission.pageId.forEach((page) => {
    const pageId = page._id.toString();
    if (!permissionMap.has(pageId)) {
      permissionMap.set(pageId, {
        page,
        roleId: permission.roleId,
        create: permission.create,
        edit: permission.edit,
        view: permission.view,
        delete: permission.delete,
      });
    } else {
      const existing = permissionMap.get(pageId);
      permissionMap.set(pageId, {
        ...existing,
        create: existing.create || permission.create,
        edit: existing.edit || permission.edit,
        view: existing.view || permission.view,
        delete: existing.delete || permission.delete,
      });
    }
  });
});


  return Array.from(permissionMap.values());
};

export const checkPermission = async (
  tenantDomain: string,
  permissionCheck: IPermissionCheck,
): Promise<boolean> => {
  const { Model: Permission } = await getTenantModel(
    tenantDomain,
    'Permission',
  );
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');

  const { userId, pageId, action } = permissionCheck;

  // First check user-specific permissions
  const userPermission = await Permission.findOne({
    userId: new Types.ObjectId(userId),
    pageId: new Types.ObjectId(pageId),
  });

  if (userPermission && userPermission[action as keyof typeof userPermission]) {
    return true;
  }

  // If no user permission, check role permissions
  const user = await User.findById(userId).populate('roleId');
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const roleIds = user.roleId.map((role: any) => role._id);
  const rolePermission = await Permission.findOne({
    roleId: { $in: roleIds },
    pageId: new Types.ObjectId(pageId),
  });

  if (rolePermission && rolePermission[action as keyof typeof rolePermission]) {
    return true;
  }

  return false;
};

export const createUserPermission = async (
  tenantDomain: string,
  userId: string,
  permissionData: IPermissionRequest,
) => {
  const { Model: Permission } = await getTenantModel(
    tenantDomain,
    'Permission',
  );
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if role exists
  const role = await Role.findById(permissionData.roleId);
  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found');
  }

  // Check if page exists
  const page = await Page.findById(permissionData.pageId);
  if (!page) {
    throw new AppError(httpStatus.NOT_FOUND, 'Page not found');
  }

  // Create or update permission
  const permission = await Permission.findOneAndUpdate(
    {
      userId: new Types.ObjectId(userId),
      roleId: new Types.ObjectId(permissionData.roleId),
      pageId: new Types.ObjectId(permissionData.pageId),
    },
    {
      create: permissionData.create ?? false,
      edit: permissionData.edit ?? false,
      view: permissionData.view ?? false,
      delete: permissionData.delete ?? false,
    },
    { upsert: true, new: true },
  )
    .populate('roleId')
    .populate('pageId');

  return permission;
};

export const updateRolePermissions = async (
  tenantDomain: string,
  roleId: string,
  permissions: IPermissionRequest[],
) => {
  const { Model: Permission } = await getTenantModel(
    tenantDomain,
    'Permission',
  );
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  // Check if role exists
  const role = await Role.findById(roleId);
  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found');
  }

  // Process each permission
  const results = [];
  for (const permData of permissions) {
    // Check if page exists
    const page = await Page.findById(permData.pageId);
    if (!page) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        `Page not found: ${permData.pageId}`,
      );
    }

    // Create or update permission
    const permission = await Permission.findOneAndUpdate(
      {
        roleId: new Types.ObjectId(roleId),
        pageId: new Types.ObjectId(permData.pageId),
      },
      {
        create: permData.create ?? false,
        edit: permData.edit ?? false,
        view: permData.view ?? false,
        delete: permData.delete ?? false,
      },
      { upsert: true, new: true },
    )
      .populate('roleId')
      .populate('pageId');

    results.push(permission);
  }

  return results;
};

export const PermissionService = {
  getUserPermissions,
  checkPermission,
  createUserPermission,
  updateRolePermissions,
};
