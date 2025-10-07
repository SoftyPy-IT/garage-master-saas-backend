// src/modules/permission/permission.service.ts
import httpStatus from 'http-status';
import mongoose, { Types } from 'mongoose';
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
export const createUserPermission = async (
  tenantDomain: string,
  userId: string,
  permissionData: any,
) => {
  // Get Permission model and its connection
  const { Model: Permission, connection } = await getTenantModel(tenantDomain, 'Permission');
  const session = await connection.startSession();

  try {
    session.startTransaction();

    // Get other models using the same connection
    const { Model: User } = await getTenantModel(tenantDomain, 'User');
    const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
    const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

    // Convert IDs
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
    const user = await User.findById(userId).session(session);
    if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

    const roles = await Role.find({ _id: { $in: roleIds } }).session(session);
    if (!roles.length) throw new AppError(httpStatus.NOT_FOUND, 'Role not found');

    const pages = await Page.find({ _id: { $in: pageIds } }).session(session);
    if (!pages.length) throw new AppError(httpStatus.NOT_FOUND, 'Page not found');

    // Create permission
    const [newPermission] = await Permission.create(
      [
        {
          userId: userIds,
          roleId: roleIds,
          pageId: pageIds,
          create: permissionData.create ?? false,
          edit: permissionData.edit ?? false,
          view: permissionData.view ?? false,
          delete: permissionData.delete ?? false,
        },
      ],
      { session }
    );

    // Link permission to user
    await User.updateOne(
      { _id: userId },
      [
        {
          $set: {
            permission: {
              $cond: {
                if: { $isArray: '$permission' },
                then: { $concatArrays: ['$permission', [newPermission._id]] },
                else: [newPermission._id],
              },
            },
          },
        },
      ],
      { session }
    );

    // Commit transaction
    await session.commitTransaction();

    // Return populated permission
    return await Permission.findById(newPermission._id)
      .populate('userId')
      .populate('roleId')
      .populate('pageId')
      .session(session);
  } catch (error: any) {
    // Abort only if transaction not committed
    try {
      await session.abortTransaction();
    } catch (abortError) {
      // ignore, already committed or not active
    }
    throw new AppError(httpStatus.BAD_REQUEST, error.message || 'Failed to create permission');
  } finally {
    session.endSession(); // always end session
  }
};

const updateUserPermission = async (
  tenantDomain: string,
  userId: string,
  permissionId: string,
  permissionData: any
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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

    // 🔄 Update Permission document
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
      { new: true, session },
    );

    if (!updatedPermission) {
      throw new AppError(httpStatus.NOT_FOUND, 'Permission not found');
    }

    // 🔗 Link Permission with User (if not already linked)
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { permission: updatedPermission._id } },
      { session },
    );

    // ✅ Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Return fully populated result
    return await Permission.findById(updatedPermission._id)
      .populate('roleId')
      .populate('pageId');
  } catch (error: any) {
    // ❌ Rollback if anything fails
    await session.abortTransaction();
    session.endSession();
    throw new AppError(httpStatus.BAD_REQUEST, error.message || 'Failed to update permission');
  }
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
export const deleteUserPermission = async (
  tenantDomain: string,
  userId: string,
  permissionId: string
) => {
  const { Model: Permission } = await getTenantModel(tenantDomain, 'Permission');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  // Validate user existence
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Find and delete permission
  const deletedPermission = await Permission.findOneAndDelete({
    _id: permissionId,
    userId: { $in: [userId] },
  });

  if (!deletedPermission) {
    throw new AppError(httpStatus.NOT_FOUND, 'Permission not found or already deleted');
  }

  return deletedPermission;
};

 const updateMultiplePermissions = async (
  tenantDomain: string,
  permissionUpdates: Array<{
    permissionId: string;
    userId?: string | string[];
    roleId?: string | string[];
    pageId?: string | string[];
    create?: boolean;
    edit?: boolean;
    view?: boolean;
    delete?: boolean;
  }>
) => {
  // Get Permission model and its connection
  const { Model: Permission, connection } = await getTenantModel(tenantDomain, 'Permission');
  const session = await connection.startSession();
  session.startTransaction();

  try {
    // Use the same connection for all models
    const { Model: User } = await getTenantModel(tenantDomain, 'User');
    const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
    const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

    const updatedPermissions = [];

    for (const update of permissionUpdates) {
      const { permissionId, userId, roleId, pageId, ...permissionData } = update;

      // Find existing permission
      const existingPermission = await Permission.findById(permissionId).session(session);
      if (!existingPermission) {
        throw new AppError(httpStatus.NOT_FOUND, `Permission with ID ${permissionId} not found`);
      }

      // Convert IDs to ObjectId arrays (or keep existing)
      const userIds = userId
        ? Array.isArray(userId)
          ? userId.map(id => new Types.ObjectId(id))
          : [new Types.ObjectId(userId)]
        : existingPermission.userId;

      const roleIds = roleId
        ? Array.isArray(roleId)
          ? roleId.map(id => new Types.ObjectId(id))
          : [new Types.ObjectId(roleId)]
        : existingPermission.roleId;

      const pageIds = pageId
        ? Array.isArray(pageId)
          ? pageId.map(id => new Types.ObjectId(id))
          : [new Types.ObjectId(pageId)]
        : existingPermission.pageId;

      // Validate existence
      const userDocs = await User.find({ _id: { $in: userIds } }).session(session);
      if (!userDocs.length) throw new AppError(httpStatus.NOT_FOUND, 'User(s) not found');

      const roleDocs = await Role.find({ _id: { $in: roleIds } }).session(session);
      if (!roleDocs.length) throw new AppError(httpStatus.NOT_FOUND, 'Role(s) not found');

      const pageDocs = await Page.find({ _id: { $in: pageIds } }).session(session);
      if (!pageDocs.length) throw new AppError(httpStatus.NOT_FOUND, 'Page(s) not found');

      // Update Permission
      const updatedPermission = await Permission.findByIdAndUpdate(
        permissionId,
        {
          userId: userIds,
          roleId: roleIds,
          pageId: pageIds,
          create: permissionData.create ?? existingPermission.create,
          edit: permissionData.edit ?? existingPermission.edit,
          view: permissionData.view ?? existingPermission.view,
          delete: permissionData.delete ?? existingPermission.delete,
        },
        { new: true, runValidators: true, session }
      )
        .populate('userId')
        .populate('roleId')
        .populate('pageId');

      // Link updated permission to Users safely
      for (const uid of userIds) {
        // Ensure the user's `permission` field is an array
        await User.updateOne(
          { _id: uid },
          [
            {
              $set: {
                permission: {
                  $cond: {
                    if: { $isArray: '$permission' },
                    then: { $concatArrays: ['$permission', [updatedPermission._id]] },
                    else: [updatedPermission._id],
                  },
                },
              },
            },
          ],
          { session }
        );
      }

      updatedPermissions.push(updatedPermission);
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return updatedPermissions;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(httpStatus.BAD_REQUEST, error.message || 'Failed to update permissions');
  }
};





export const PermissionService = {
  getUserPermissions,
  createUserPermission,
  updateUserPermission,
  getSinglePermission,
  deleteUserPermission,
  updateMultiplePermissions
};
