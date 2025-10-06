// src/modules/permission/permission.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { PermissionService } from './permission.service';
import { IPermissionRequest } from './permission.interface';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';

const getUserPermissions = catchAsync(async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;
  const userId = req.params.userId || (req.user?.userId as string);

  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User ID is required');
  }

  const result = await PermissionService.getUserPermissions(tenantDomain, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User permissions retrieved successfully',
    data: result,
  });
});

const createUserPermission = catchAsync(async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;
  const userId = req.params.userId;
  const permissionData = req.body as IPermissionRequest;
  console.log('permission check', permissionData)
  console.log('body check', req.body)
  const result = await PermissionService.createUserPermission(tenantDomain, userId, permissionData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'User permission created successfully',
    data: result,
  });
});

const updateRolePermissions = catchAsync(async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;
  const roleId = req.params.roleId;
  const permissions = req.body as IPermissionRequest[];

  const result = await PermissionService.updateRolePermissions(tenantDomain, roleId, permissions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Role permissions updated successfully',
    data: result,
  });
});

const checkPermission = catchAsync(async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;
  const result = await PermissionService.checkPermission(tenantDomain, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission checked successfully',
    data: { hasPermission: result },
  });
});

const getMyPermissions = catchAsync(async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;
  
  if (!req.user?.userId) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not authenticated');
  }

  const result = await PermissionService.getUserPermissions(tenantDomain, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your permissions retrieved successfully',
    data: result,
  });
});

export const PermissionController = {
  getUserPermissions,
  createUserPermission,
  updateRolePermissions,
  checkPermission,
  getMyPermissions,
};