import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { TUser } from './user.interface';
import { createToken } from '../Auth/auth.utils';
import config from '../../config';
import AppError from '../../errors/AppError';
import { getTenantModel } from '../../utils/getTenantModels';
import { Tenant } from '../tenant/tenant.model';
import { PermissionService } from '../permission/permission.service';
import { Types } from 'mongoose';

export const createUser = async (payload: TUser) => {
  const { Model: User, tenant } = await getTenantModel(
    payload.tenantDomain,
    'User',
  );

  const userByEmail = await User.findOne({ email: payload.email });
  if (userByEmail) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email is already registered!');
  }

  const userByName = await User.findOne({ name: payload.name });
  if (userByName) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Username is already taken!');
  }

  const tenantInfo = await Tenant.findOne({ domain: payload.tenantDomain });
  if (!tenantInfo) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tenant not found!');
  }

  const newUser = await User.create({
    ...payload,
    tenantId: tenantInfo._id,
    tenantInfo: {
      name: tenantInfo.name,
      domain: tenantInfo.domain,
      businessType: tenantInfo.businessType,
      dbUri: tenantInfo.dbUri,
      isActive: tenantInfo.isActive,
      subscription: tenantInfo.subscription,
    },
  });

  const jwtPayload = {
    userId: newUser._id.toString(),
    name: newUser.name,
    role: newUser.role,
    tenantId: tenantInfo._id.toString(),
    domain: newUser.domain,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string,
  );

  return {
    accessToken,
    refreshToken,
    user: {
      userId: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      tenantId: tenantInfo._id,
      token: accessToken,
      tenantInfo: newUser.tenantInfo,
    },
  };
};
const getAllUser = async (tenantDomain: string, query: any) => {
  const { isRecycled } = query;

  const { Model: User } = await getTenantModel(
    tenantDomain || 'default',
    'User',
  );
  const { Model: Permission } = await getTenantModel(
    tenantDomain || 'default',
    'Permission',
  );
  const { Model: Page } = await getTenantModel(
    tenantDomain || 'default',
    'Page',
  );
  const { Model: Role } = await getTenantModel(
    tenantDomain || 'default',
    'Role',
  );

  const filter: any = {};

  if (isRecycled !== undefined) {
    if (isRecycled === 'true' || isRecycled === true) {
      filter.isRecycled = true;
    } else {
      filter.$or = [{ isRecycled: false }, { isRecycled: { $exists: false } }];
    }
  }

  const result = await User.find(filter)
    .populate([
      {
        path: 'permission',
        model: Permission,
        populate: [
          { path: 'pageId', model: Page },
          { path: 'roleId', model: Role },
        ],
      },
      { path: 'pageId', model: Page },
      { path: 'roleId', model: Role },
    ])
    .lean();

  return result;
};

const deleteUser = async (tenantDomain: string, id: string) => {
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const result = await User.deleteOne({ _id: id });
  return result;
};

const updateUser = async (
  tenantDomain: string,
  id: string,
  payload: Partial<TUser>,
) => {
  const { Model: User } = await getTenantModel(tenantDomain, 'User');

  const existingUser = await User.findById(id);
  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // Optional: Prevent duplicate email or username
  if (payload.email && payload.email !== existingUser.email) {
    const emailExists = await User.findOne({ email: payload.email });
    if (emailExists) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Email already in use!');
    }
  }

  if (payload.name && payload.name !== existingUser.name) {
    const nameExists = await User.findOne({ name: payload.name });
    if (nameExists) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Username already taken!');
    }
  }

  if (payload.password && typeof payload.password === 'string') {
    const hashedPassword = await bcrypt.hash(
      payload.password,
      Number(config.bcrypt_salt_round),
    );
    payload.password = hashedPassword;
  }

  const updatedUser = await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate('roleId');

  return updatedUser;
};

const assignRoleToUser = async (
  tenantDomain: string,
  userId: string,
  roleId: string,
) => {
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const role = await Role.findById(roleId);
  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found');
  }

  // Add role to user
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { roleId: new Types.ObjectId(roleId) } },
    { new: true },
  ).populate('roleId');

  return updatedUser;
};

const getUserPermissions = async (tenantDomain: string, userId: string) => {
  const permissions = await PermissionService.getUserPermissions(
    tenantDomain,
    userId,
  );
  return permissions;
};

const moveToRecycleBin = async (tenantDomain: string, id: string) => {
  const { Model: User } = await getTenantModel(tenantDomain, 'User');

  const user = await User.findById(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const updated = await User.findByIdAndUpdate(
    id,
    {
      isRecycled: true,
      recycledAt: new Date(),
    },
    { new: true },
  );

  return updated;
};

const restoreUser = async (tenantDomain: string, id: string) => {
  const { Model: User } = await getTenantModel(tenantDomain, 'User');

  const user = await User.findById(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const updated = await User.findByIdAndUpdate(
    id,
    {
      isRecycled: false,
      recycledAt: null,
    },
    { new: true },
  );

  return updated;
};

const permanentDeleteUser = async (tenantDomain: string, id: string) => {
  const { Model: User } = await getTenantModel(tenantDomain, 'User');

  const user = await User.findById(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const result = await User.deleteOne({ _id: id });
  return result;
};

export const UserServices = {
  createUser,
  getAllUser,
  deleteUser,
  updateUser,
  assignRoleToUser,
  getUserPermissions,
  moveToRecycleBin,
  restoreUser,
  permanentDeleteUser,
};
