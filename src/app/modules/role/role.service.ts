// src/modules/role/role.service.ts
import httpStatus from 'http-status';
import { IRole } from './role.interface';
import AppError from '../../errors/AppError';
import { getTenantModel } from '../../utils/getTenantModels';
import { PermissionService } from '../permission/permission.service';

const createRole = async (tenantDomain: string, payload: IRole) => {
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const roleExists = await Role.findOne({ name: payload.name });
  if (roleExists) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Role name already exists!');
  }
  const role = await Role.create(payload);
  return role;
};

const getAllRoles = async (tenantDomain: string) => {
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const { Model: Permission } = await getTenantModel(tenantDomain, 'Permission');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  return Role.find().populate([
    {
      path: 'permissions',
      model: Permission,
      populate: [
        { path: 'userId', model: User, },
        { path: 'roleId', model: Role,  },
        { path: 'pageId', model: Page, }
      ]
    }
  ]);
};


const getRoleById = async (tenantDomain: string, id: string) => {
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const result = await Role.findById(id).populate('permissions');

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found!');
  }
  return result;
};

const updateRole = async (
  tenantDomain: string,
  id: string,
  payload: Partial<IRole>,
) => {
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');

  // Check if role exists
  const role = await Role.findById(id);
  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found!');
  }

  // Check for duplicate name
  if (payload.name && payload.name !== role.name) {
    const roleExists = await Role.findOne({ name: payload.name });
    if (roleExists) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Role name already exists!');
    }
  }

  // Update role
  const result = await Role.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate('permissions');

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found!');
  }

  return result;
};

const deleteRole = async (tenantDomain: string, id: string) => {
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');

  // Check if role exists
  const role = await Role.findById(id);
  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found!');
  }

  // Check if role is assigned to users
  const usersWithRole = await User.countDocuments({ roleId: id });
  if (usersWithRole > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete role. ${usersWithRole} users are assigned to this role.`,
    );
  }

  const result = await Role.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found!');
  }

  return result;
};

// Assign permissions to a role
const assignPermissionsToRole = async (
  tenantDomain: string,
  roleId: string,
  permissions: any[],
) => {
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');

  const role = await Role.findById(roleId);
  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found');
  }

  // Update role with permissions
  const updatedRole = await Role.findByIdAndUpdate(
    roleId,
    { permissions },
    { new: true },
  ).populate('permissions');

  return updatedRole;
};

export const RoleService = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignPermissionsToRole,
};
