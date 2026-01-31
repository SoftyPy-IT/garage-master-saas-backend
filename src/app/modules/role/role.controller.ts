// src/modules/role/role.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { RoleService } from './role.service';
import { IRole } from './role.interface';
import sendResponse from '../../utils/sendResponse';

const createRole = catchAsync(async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;
  const result = await RoleService.createRole(tenantDomain, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Role created successfully!',
    data: result,
  });
});

const getAllRoles = catchAsync(async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;
  const result = await RoleService.getAllRoles(tenantDomain);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Roles retrieved successfully!',
    data: result,
  });
});

const getRoleById = catchAsync(async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;
  const result = await RoleService.getRoleById(tenantDomain, req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Role retrieved successfully!',
    data: result,
  });
});

const updateRole = catchAsync(async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;
  const result = await RoleService.updateRole(
    tenantDomain,
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Role updated successfully!',
    data: result,
  });
});

const deleteRole = catchAsync(async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;
  const result = await RoleService.deleteRole(tenantDomain, req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Role deleted successfully!',
    data: result,
  });
});

const assignPermissionsToRole = catchAsync(
  async (req: Request, res: Response) => {
    const tenantDomain = req.query.tenantDomain as string;
    const { roleId } = req.params;
    const { permissions } = req.body;

    const result = await RoleService.assignPermissionsToRole(
      tenantDomain,
      roleId,
      permissions,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Permissions assigned to role successfully!',
      data: result,
    });
  },
);

export const RoleController = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignPermissionsToRole,
};
