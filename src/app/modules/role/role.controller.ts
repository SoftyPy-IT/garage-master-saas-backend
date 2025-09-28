// src/modules/role/role.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { RoleService } from './role.service';
import { IRole, IRoleDocument } from './role.interface';
import sendResponse from '../../utils/sendResponse';

const createRole = catchAsync(async (req: Request, res: Response) => {
  const result = await RoleService.createRole(req.body as IRole);
  
  sendResponse<IRoleDocument>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Role created successfully!',
    data: result,
  });
});

const getAllRoles = catchAsync(async (req: Request, res: Response) => {
  const result = await RoleService.getAllRoles();
  
  sendResponse<IRoleDocument[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Roles retrieved successfully!',
    data: result,
  });
});

const getRoleById = catchAsync(async (req: Request, res: Response) => {
  const result = await RoleService.getRoleById(req.params.id);
  
  sendResponse<IRoleDocument>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Role retrieved successfully!',
    data: result,
  });
});

const updateRole = catchAsync(async (req: Request, res: Response) => {
  const result = await RoleService.updateRole(req.params.id, req.body);
  
  sendResponse<IRoleDocument>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Role updated successfully!',
    data: result,
  });
});

const deleteRole = catchAsync(async (req: Request, res: Response) => {
  const result = await RoleService.deleteRole(req.params.id);
  
  sendResponse<IRoleDocument>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Role deleted successfully!',
    data: result,
  });
});

export const RoleController = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
};