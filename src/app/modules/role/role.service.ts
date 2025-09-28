// src/modules/role/role.service.ts
import httpStatus from 'http-status';
import { IRole, IRoleDocument } from './role.interface';
import Role from './role.model';
import AppError from '../../errors/AppError';
import Page from '../page/page.model';
import { User } from '../user/user.model';

const createRole = async (payload: IRole): Promise<IRoleDocument> => {
  // Check if the role name already exists
  const roleExists = await Role.isRoleExistsByName(payload.name);
  if (roleExists) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Role name already exists!');
  }

  // Validate permissions
  if (payload.permissions && payload.permissions.length > 0) {
    // Check if all pages exist
    const pageIds = payload.permissions.map(permission => permission.pageId);
    const pages = await Page.find({ _id: { $in: pageIds } });
    
    if (pages.length !== pageIds.length) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Some pages do not exist!');
    }
  }

  // Create the role
  const result = await Role.create(payload);
  return result;
};

const getAllRoles = async () => {
  const result = await Role.find().populate('permissions.pageId');
  return result;
};

const getRoleById = async (id: string): Promise<IRoleDocument> => {
  const result = await Role.findById(id).populate('permissions.pageId');
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found!');
  }
  return result;
};

const updateRole = async (id: string, payload: Partial<IRole>): Promise<IRoleDocument> => {
  // Check if the role exists
  const role = await Role.findById(id);
  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found!');
  }
  
  // Check if the role name already exists (if name is being updated)
  if (payload.name && payload.name !== role.name) {
    const roleExists = await Role.isRoleExistsByName(payload.name);
    if (roleExists) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Role name already exists!');
    }
  }
  
  // Validate permissions
  if (payload.permissions && payload.permissions.length > 0) {
    // Check if all pages exist
    const pageIds = payload.permissions.map(permission => permission.pageId);
    const pages = await Page.find({ _id: { $in: pageIds } });
    
    if (pages.length !== pageIds.length) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Some pages do not exist!');
    }
  }
  
  // Update the role
  const result = await Role.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate('permissions.pageId');
  
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found!');
  }
  
  return result;
};

const deleteRole = async (id: string): Promise<IRoleDocument> => {
  // Check if the role exists
  const role = await Role.findById(id);
  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found!');
  }
  
  // Check if any users are using this role
  const usersWithRole = await User.countDocuments({ roleId: id });
  if (usersWithRole > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST, 
      `Cannot delete role. ${usersWithRole} users are assigned to this role.`
    );
  }
  
  // Delete the role
  const result = await Role.findByIdAndDelete(id);
  
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Role not found!');
  }
  
  return result;
};

export const RoleService = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
};