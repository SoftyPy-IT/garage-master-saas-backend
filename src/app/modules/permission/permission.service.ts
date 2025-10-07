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

export const getUserPermissions = async (tenantDomain: string, userId: string) => {
  const { Model: Permission } = await getTenantModel(tenantDomain, 'Permission');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  //  Check if user exists
  const user = await User.findById(userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  // Populate user-specific permissions
  const userPermissions = await Permission.find({
    userId: new Types.ObjectId(userId),
  })
    .populate({ path: 'roleId', model: Role })
    .populate({ path: 'pageId', model: Page })
    .lean();

  // Get role-based permissions
  const roleIds = user.roleId.map((role: any) => role._id || role);
  const rolePermissions = await Permission.find({
    roleId: { $in: roleIds },
    userId: { $ne: new Types.ObjectId(userId) },
  })
    .populate({ path: 'roleId', model: Role })
    .populate({ path: 'pageId', model: Page })
    .lean();

  // Merge both user and role permissions
  const allPermissions = [...userPermissions, ...rolePermissions];

  // ✅ Build permission map to merge duplicate pages
  const permissionMap = new Map<string, any>();

  allPermissions.forEach((permission) => {
    if (!permission.pageId || !permission.pageId.length) return;

    permission.pageId.forEach((page: any) => {
      const pageIdStr = page?._id?.toString?.();
      if (!pageIdStr) return;

      const existing = permissionMap.get(pageIdStr);
      if (!existing) {
        permissionMap.set(pageIdStr, {
          _id: permission._id,
          page: {
            _id: page._id,
            name: page.name,
            slug: page.slug,
            ...page,
          },
          roles: permission.roleId.map((r: any) => ({
            _id: r._id,
            name: r.name,
            ...r,
          })),
          create: permission.create ?? false,
          edit: permission.edit ?? false,
          view: permission.view ?? false,
          delete: permission.delete ?? false,
        });
      } else {
        // Merge permissions (logical OR)
        permissionMap.set(pageIdStr, {
          ...existing,
          create: existing.create || permission.create,
          edit: existing.edit || permission.edit,
          view: existing.view || permission.view,
          delete: existing.delete || permission.delete,
        });
      }
    });
  });

  const permissionsArray = Array.from(permissionMap.values());

  // Fetch total counts
  const [totalPages, totalRoles, totalUsers, totalPermissions] = await Promise.all([
    Page.countDocuments(),
    Role.countDocuments(),
    User.countDocuments(),
    Permission.countDocuments(),
  ]);

  // Return structured response
  return {
    summary: {
      totalPages,
      totalRoles,
      totalUsers,
      totalPermissions,
    },
    permissions: permissionsArray,
  };
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
  permissionData: any,
) => {
  const { Model: Permission } = await getTenantModel(tenantDomain, 'Permission');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  // Convert string IDs to ObjectId arrays
  const userIds = Array.isArray(permissionData.userId)
    ? permissionData.userId.map((id: any) => new Types.ObjectId(id))
    : [new Types.ObjectId(permissionData.userId)];

  const roleIds = Array.isArray(permissionData.roleId)
    ? permissionData.roleId.map((id: any) => new Types.ObjectId(id))
    : [new Types.ObjectId(permissionData.roleId)];

  const pageIds = Array.isArray(permissionData.pageId)
    ? permissionData.pageId.map((id: any) => new Types.ObjectId(id))
    : [new Types.ObjectId(permissionData.pageId)];

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  // Optional: check roles exist
  const roles = await Role.find({ _id: { $in: roleIds } });
  if (!roles.length) throw new AppError(httpStatus.NOT_FOUND, 'Role not found');

  //  check pages exist
  const pages = await Page.find({ _id: { $in: pageIds } });
  if (!pages.length) throw new AppError(httpStatus.NOT_FOUND, 'Page not found');

  // Create or update permissions
  const permission = await Permission.findOneAndUpdate(
    {
      userId: { $all: userIds },
      roleId: { $all: roleIds },
      pageId: { $all: pageIds },
    },
    {
      userId: userIds,
      roleId: roleIds,
      pageId: pageIds,
      create: permissionData.create ?? false,
      edit: permissionData.edit ?? false,
      view: permissionData.view ?? false,
      delete: permissionData.delete ?? false,
    },
    { upsert: true, new: true }
  )
    .populate('roleId')
    .populate('pageId');

  return permission;
};


export const updateUserPermission = async (
  tenantDomain: string,
  userId: string,
  permissionId: string,
  permissionData: any
) => {
  const { Model: Permission } = await getTenantModel(tenantDomain, 'Permission');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  // Convert string IDs to ObjectId arrays
  const userIds = Array.isArray(permissionData.userId)
    ? permissionData.userId.map((id: any) => new Types.ObjectId(id))
    : [new Types.ObjectId(permissionData.userId)];

  const roleIds = Array.isArray(permissionData.roleId)
    ? permissionData.roleId.map((id: any) => new Types.ObjectId(id))
    : [new Types.ObjectId(permissionData.roleId)];

  const pageIds = Array.isArray(permissionData.pageId)
    ? permissionData.pageId.map((id: any) => new Types.ObjectId(id))
    : [new Types.ObjectId(permissionData.pageId)];

  // Validate existence
  const user = await User.findById(userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const roles = await Role.find({ _id: { $in: roleIds } });
  if (!roles.length) throw new AppError(httpStatus.NOT_FOUND, 'Role not found');

  const pages = await Page.find({ _id: { $in: pageIds } });
  if (!pages.length) throw new AppError(httpStatus.NOT_FOUND, 'Page not found');

  // Update the specific permission by ID
  const updatedPermission = await Permission.findByIdAndUpdate(
    permissionId,
    {
      userId: userIds,
      roleId: roleIds,
      pageId: pageIds,
      create: permissionData.create ?? false,
      edit: permissionData.edit ?? false,
      view: permissionData.view ?? false,
      delete: permissionData.delete ?? false,
    },
    { new: true }
  )
    .populate('roleId')
    .populate('pageId');

  if (!updatedPermission) {
    throw new AppError(httpStatus.NOT_FOUND, 'Permission not found');
  }

  return updatedPermission;
};




const getSinglePermission = async (tenantDomain: string, id: string) => {
  const { Model: Permission } = await getTenantModel(tenantDomain, 'Permission');
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const result = await Permission.findById(id).populate([
    { path: 'roleId', model: Role },
    { path: 'pageId', model: Page },
    { path: 'userId', model: User },

  ])

  return result

}


export const PermissionService = {
  getUserPermissions,
  checkPermission,
  createUserPermission,
  updateUserPermission,
  getSinglePermission
};
