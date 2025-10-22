
import httpStatus from 'http-status';
import mongoose, { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { getTenantModel } from '../../utils/getTenantModels';
import { redisClient } from '../../utils/redis';
import { getAllPermissionsCacheKey, getSinglePermissionCacheKey, getUserPermissionsCacheKey } from '../../utils/generateCashKey';

export const getUserPermissions = async (tenantDomain: string, userId: string) => {
  const cacheKey = getUserPermissionsCacheKey(tenantDomain, userId);

  // firstly check from redis
  const cachedPermissions = await redisClient.get(cacheKey);
  if (cachedPermissions) {
    return JSON.parse(cachedPermissions);
  }

  const { Model: Permission } = await getTenantModel(tenantDomain, 'Permission');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  const user = await User.findById(userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

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

  // Build permission map to merge duplicate pages
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
        // Merge permissions 
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
  const [totalPages, totalRoles, totalUsers, totalPermissions] = await Promise.all([
    Page.countDocuments(),
    Role.countDocuments(),
    User.countDocuments(),
    Permission.countDocuments(),
  ]);
  const result = {
    summary: {
      totalPages,
      totalRoles,
      totalUsers,
      totalPermissions,
    },
    permissions: permissionsArray,
  };
  await redisClient.set(cacheKey, JSON.stringify(result), 300);

  return result;
};

export const createUserPermission = async (
  tenantDomain: string,
  userId: string,
  permissionData: any,
) => {
  const { Model: Permission, connection } = await getTenantModel(tenantDomain, 'Permission');
  const session = await connection.startSession();
  session.startTransaction();

  try {
    const { Model: User } = await getTenantModel(tenantDomain, 'User');
    const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
    const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

    // Convert IDs properly
    const roleIds = (Array.isArray(permissionData.roleId)
      ? permissionData.roleId
      : [permissionData.roleId]
    ).map((id: string) => new Types.ObjectId(id));

    const pageIds = (Array.isArray(permissionData.pageId)
      ? permissionData.pageId
      : [permissionData.pageId]
    ).map((id: string) => new Types.ObjectId(id));

    // Validate user existence
    const user = await User.findById(userId).session(session);
    if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

    // Validate roles
    const roles = await Role.find({ _id: { $in: roleIds } }).session(session);
    if (!roles.length) throw new AppError(httpStatus.NOT_FOUND, 'Role not found');

    // Validate pages
    const pages = await Page.find({ _id: { $in: pageIds } }).session(session);
    if (!pages.length) throw new AppError(httpStatus.NOT_FOUND, 'Page not found');

    // Create permission safely
    const [newPermission] = await Permission.create(
      [
        {
          userId: [new Types.ObjectId(userId)],
          roleId: roleIds,
          pageId: pageIds,
          create: !!permissionData.create,
          edit: !!permissionData.edit,
          view: !!permissionData.view,
          delete: !!permissionData.delete,
        },
      ],
      { session }
    );

    // Link permission to user — transaction-safe, atomic
    const afterUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { permission: newPermission._id } },
      { session, new: true }
    );

    console.log('user data this ', afterUser)
    await session.commitTransaction();
    const populatedPermission = await Permission.findById(newPermission._id)
      .populate('userId')
      .populate('roleId')
      .populate('pageId');
    await redisClient.invalidateUserCache(tenantDomain, userId);
    await redisClient.invalidateAllPermissionCache(tenantDomain);

    return populatedPermission;
  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    throw new AppError(httpStatus.BAD_REQUEST, error.message || 'Failed to create permission');
  } finally {
    await session.endSession();
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

    // Update Permission document
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

    // Link Permission with User (if not already linked)
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { permission: updatedPermission._id } },
      { session },
    );
    await session.commitTransaction();
    session.endSession();

    //clear 
    await redisClient.invalidateUserCache(tenantDomain, userId);
    await redisClient.invalidatePermissionCache(tenantDomain, permissionId);
    return await Permission.findById(updatedPermission._id)
      .populate('roleId')
      .populate('pageId');
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(httpStatus.BAD_REQUEST, error.message || 'Failed to update permission');
  }
};

const getSinglePermission = async (tenantDomain: string, id: string) => {
  const cacheKey = getSinglePermissionCacheKey(tenantDomain, id);

  // check from redis
  const cachedPermission = await redisClient.get(cacheKey);
  if (cachedPermission) {
    return JSON.parse(cachedPermission);
  }


  const { Model: Permission } = await getTenantModel(tenantDomain, 'Permission');
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const result = await Permission.findById(id).populate([
    { path: 'roleId', model: Role },
    { path: 'pageId', model: Page },
    { path: 'userId', model: User },
  ]);

  if (result) {
    await redisClient.set(cacheKey, JSON.stringify(result), 600);
  }

  return result;
}

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
  const { Model: Permission, connection } = await getTenantModel(tenantDomain, 'Permission');
  const session = await connection.startSession();
  session.startTransaction();

  try {
    // Use the same connection for all models
    const { Model: User } = await getTenantModel(tenantDomain, 'User');
    const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
    const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

    const updatedPermissions = [];
    const affectedUsers = new Set<string>();
    console.log('permission check', permissionUpdates)

    for (const update of permissionUpdates) {
      const { permissionId, userId, roleId, pageId, ...permissionData } = update;

      // Find existing permission
      const existingPermission = await Permission.findById(permissionId).session(session);
      if (!existingPermission) {
        throw new AppError(httpStatus.NOT_FOUND, `Permission with ID ${permissionId} not found`);
      }
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
      const userDocs = await User.find({ _id: { $in: userIds } }).session(session);
      if (!userDocs.length) throw new AppError(httpStatus.NOT_FOUND, 'User(s) not found');

      const roleDocs = await Role.find({ _id: { $in: roleIds } }).session(session);
      if (!roleDocs.length) throw new AppError(httpStatus.NOT_FOUND, 'Role(s) not found');

      const pageDocs = await Page.find({ _id: { $in: pageIds } }).session(session);
      if (!pageDocs.length) throw new AppError(httpStatus.NOT_FOUND, 'Page(s) not found');
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
        affectedUsers.add(uid.toString());
      }

      updatedPermissions.push(updatedPermission);
    }
    await session.commitTransaction();
    session.endSession();

    // clear all cash
    for (const userId of affectedUsers) {
      await redisClient.invalidateUserCache(tenantDomain, userId);
    }
    for (const update of permissionUpdates) {
      await redisClient.invalidatePermissionCache(tenantDomain, update.permissionId);
    }

    await redisClient.invalidateAllPermissionCache(tenantDomain);

    return updatedPermissions;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(httpStatus.BAD_REQUEST, error.message || 'Failed to update permissions');
  }
};

export const createMultipleUserPermissions = async (
  tenantDomain: string,
  permissionDataArray: Array<{
    userId: string | string[];
    pageId: string | string[];
    roleId?: string | string[];
    create?: boolean;
    edit?: boolean;
    view?: boolean;
    delete?: boolean;
  }>
) => {
  const { Model: Permission, connection } = await getTenantModel(tenantDomain, 'Permission');
  const session = await connection.startSession();
  session.startTransaction();

  try {
    const { Model: User } = await getTenantModel(tenantDomain, 'User');
    const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
    const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

    const results = [];
    const affectedUsers = new Set<string>();

    for (const permissionData of permissionDataArray) {
      // Normalize possible arrays ([id])
      const userId =
        Array.isArray(permissionData.userId) ? permissionData.userId[0] : permissionData.userId;
      const pageId =
        Array.isArray(permissionData.pageId) ? permissionData.pageId[0] : permissionData.pageId;
      const roleId =
        Array.isArray(permissionData.roleId) ? permissionData.roleId[0] : permissionData.roleId;

      const { create, edit, view, delete: del } = permissionData;
      const user = await User.findById(userId).session(session);
      if (!user) throw new AppError(httpStatus.NOT_FOUND, `User with ID ${userId} not found`);
      const page = await Page.findById(pageId).session(session);
      if (!page) throw new AppError(httpStatus.NOT_FOUND, `Page with ID ${pageId} not found`);
      let roleObjectId;
      if (roleId) {
        const role = await Role.findById(roleId).session(session);
        if (!role) throw new AppError(httpStatus.NOT_FOUND, `Role with ID ${roleId} not found`);
        roleObjectId = new Types.ObjectId(roleId);
      }

      // Check for existing permission
      const existingPermission = await Permission.findOne({
        userId: new Types.ObjectId(userId),
        pageId: new Types.ObjectId(pageId),
      }).session(session);

      if (existingPermission) {
        const updatedPermission = await Permission.findByIdAndUpdate(
          existingPermission._id,
          {
            $set: {
              create: create ?? existingPermission.create,
              edit: edit ?? existingPermission.edit,
              view: view ?? existingPermission.view,
              delete: del ?? existingPermission.delete,
              ...(roleObjectId && { roleId: [roleObjectId] }),
            },
          },
          { new: true, runValidators: true, session }
        )
          .populate('userId')
          .populate('roleId')
          .populate('pageId');

        results.push({
          action: 'updated',
          permission: updatedPermission,
        });
      } else {
        // Create new permission
        const [newPermission] = await Permission.create(
          [
            {
              userId: [new Types.ObjectId(userId)],
              pageId: [new Types.ObjectId(pageId)],
              ...(roleObjectId && { roleId: [roleObjectId] }),
              create: create ?? false,
              edit: edit ?? false,
              view: view ?? false,
              delete: del ?? false,
            },
          ],
          { session }
        );

        // Link permission to user
        await User.findByIdAndUpdate(
          userId,
          { $addToSet: { permission: newPermission._id } },
          { session }
        );

        const populatedPermission = await Permission.findById(newPermission._id)
          .populate('userId')
          .populate('roleId')
          .populate('pageId')
          .session(session);

        results.push({
          action: 'created',
          permission: populatedPermission,
        });
      }
      affectedUsers.add(userId);
    }

    await session.commitTransaction();
    session.endSession();

    // clear cash
    for (const userId of affectedUsers) {
      await redisClient.invalidateUserCache(tenantDomain, userId);
    }

    await redisClient.invalidateAllPermissionCache(tenantDomain);

    return results;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(
      httpStatus.BAD_REQUEST,
      error.message || 'Failed to process permissions'
    );
  }
};

export const getAllPermissions = async (tenantDomain: string, options?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  role?: string;
  user?: string;
  searchTerm?: string;
}) => {
  const cacheKey = getAllPermissionsCacheKey(tenantDomain, options);

  // check from redis
  const cachedPermissions = await redisClient.get(cacheKey);
  if (cachedPermissions) {
    return JSON.parse(cachedPermissions);
  }

  const { Model: Permission } = await getTenantModel(tenantDomain, 'Permission');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    role = '',
    user = '',
    searchTerm = ''
  } = options || {};

  const skip = (page - 1) * limit;

  const sort: any = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const query: any = {};

  if (role) {
    const roles = await Role.find({ name: { $regex: role, $options: 'i' } }).select('_id');
    const roleIds = roles.map(r => r._id);
    query.roleId = { $in: roleIds };
  }

  if (user) {
    const users = await User.find({
      $or: [
        { name: { $regex: user, $options: 'i' } },
        { email: { $regex: user, $options: 'i' } }
      ]
    }).select('_id');
    const userIds = users.map(u => u._id);
    query.userId = { $in: userIds };
  }

  if (searchTerm) {
    const pages = await Page.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { path: { $regex: searchTerm, $options: 'i' } }
      ]
    }).select('_id');

    const users = await User.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    }).select('_id');

    const pageIds = pages.map(p => p._id);
    const userIds = users.map(u => u._id);

    query.$or = [
      { pageId: { $in: pageIds } },
      { userId: { $in: userIds } }
    ];
  }

  const permissions = await Permission.find(query)
    .populate([
      { path: 'userId', model: User },
      { path: 'roleId', model: Role },
      { path: 'pageId', model: Page }
    ])
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Permission.countDocuments(query);

  const result = {
    permissions,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
  await redisClient.set(cacheKey, JSON.stringify(result), 180);

  return result;
};

export const deleteUserPermission = async (
  tenantDomain: string,
  userId: string,
  permissionId: string
) => {
  const { Model: Permission, connection } = await getTenantModel(tenantDomain, 'Permission');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const session = await connection.startSession();

  try {
    session.startTransaction();

    // Validate user existence
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    // Find the permission to ensure it exists and belongs to the user
    const permission = await Permission.findById(permissionId).session(session);
    if (!permission) {
      throw new AppError(httpStatus.NOT_FOUND, 'Permission not found');
    }

    // Check if the permission is associated with the user
    const isUserPermission = permission.userId.some((id: any) =>
      id.toString() === userId.toString()
    );

    if (!isUserPermission) {
      throw new AppError(httpStatus.FORBIDDEN, 'Permission does not belong to this user');
    }

    // Check if permission is associated with multiple users
    if (permission.userId.length > 1) {
      // If multiple users, remove only this user from the permission
      await Permission.findByIdAndUpdate(
        permissionId,
        { $pull: { userId: new Types.ObjectId(userId) } },
        { session }
      );
    } else {
      await Permission.findByIdAndDelete(permissionId, { session });
    }

    // Remove the permission reference from the user document
    await User.findByIdAndUpdate(
      userId,
      { $pull: { permission: new Types.ObjectId(permissionId) } },
      { session }
    );

    await session.commitTransaction();

    // clear cash
    await redisClient.invalidateUserCache(tenantDomain, userId);
    await redisClient.invalidatePermissionCache(tenantDomain, permissionId);
    return {
      success: true,
      message: 'Permission deleted successfully',
      data: {
        permissionId,
        userId,
        wasFullyDeleted: permission.userId.length === 1
      }
    };
  } catch (error: any) {
    await session.abortTransaction();
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to delete permission'
    );
  } finally {
    session.endSession();
  }
};

export const deleteMultipleUserPermissions = async (
  tenantDomain: string,
  userId: string,
  permissionIds: string[]
) => {
  const { Model: Permission, connection } = await getTenantModel(tenantDomain, 'Permission');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const session = await connection.startSession();

  try {
    session.startTransaction();

    // Validate user existence
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    if (!permissionIds || permissionIds.length === 0) {
      throw new AppError(httpStatus.BAD_REQUEST, 'No permission IDs provided');
    }

    // Filter out invalid ObjectIds and "batch" value
    const validPermissionIds = permissionIds.filter(id =>
      id !== 'batch' && Types.ObjectId.isValid(id)
    );

    if (validPermissionIds.length === 0) {
      throw new AppError(httpStatus.BAD_REQUEST, 'No valid permission IDs provided');
    }

    const results = [];

    // Process each valid permission
    for (const permissionId of validPermissionIds) {
      try {
        // Find the permission
        const permission = await Permission.findById(permissionId).session(session);
        if (!permission) {
          results.push({
            permissionId,
            success: false,
            message: 'Permission not found'
          });
          continue;
        }

        // Check if the permission is associated with the user
        const isUserPermission = permission.userId.some((id: any) =>
          id.toString() === userId.toString()
        );

        if (!isUserPermission) {
          results.push({
            permissionId,
            success: false,
            message: 'Permission does not belong to this user'
          });
          continue;
        }

        // Check if permission is associated with multiple users
        if (permission.userId.length > 1) {
          // If multiple users, remove only this user from the permission
          await Permission.findByIdAndUpdate(
            permissionId,
            { $pull: { userId: new Types.ObjectId(userId) } },
            { session }
          );
          results.push({
            permissionId,
            success: true,
            message: 'User removed from permission',
            wasFullyDeleted: false
          });
        } else {
          // If only this user, delete the entire permission
          await Permission.findByIdAndDelete(permissionId, { session });
          results.push({
            permissionId,
            success: true,
            message: 'Permission fully deleted',
            wasFullyDeleted: true
          });
        }
      } catch (error: any) {
        results.push({
          permissionId,
          success: false,
          message: error.message || 'Failed to process permission'
        });
      }
    }

    // Remove all permission references from the user document
    await User.findByIdAndUpdate(
      userId,
      { $pullAll: { permission: validPermissionIds.map(id => new Types.ObjectId(id)) } },
      { session }
    );


    await session.commitTransaction();
    await redisClient.invalidateUserCache(tenantDomain, userId);

    for (const permissionId of validPermissionIds) {
      await redisClient.invalidatePermissionCache(tenantDomain, permissionId);
    }

    await redisClient.invalidateAllPermissionCache(tenantDomain);

    return {
      success: true,
      message: 'Permissions processed successfully',
      data: {
        userId,
        results,
        totalProcessed: permissionIds.length,
        validProcessed: validPermissionIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
  } catch (error: any) {
    await session.abortTransaction();
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to delete permissions'
    );
  } finally {
    session.endSession();
  }
};

export const PermissionService = {
  getUserPermissions,
  createUserPermission,
  updateUserPermission,
  getSinglePermission,
  updateMultiplePermissions,
  createMultipleUserPermissions,
  getAllPermissions,
  deleteMultipleUserPermissions,
  deleteUserPermission
};