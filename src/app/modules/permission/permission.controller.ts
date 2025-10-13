// src/modules/permission/permission.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { PermissionService } from './permission.service';
import { IPermissionRequest } from './permission.interface';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';

const getUserPermissions = catchAsync(async (req, res) => {
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

const createUserPermission = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;
  const userId = req.params.userId;
  const permissionData = req.body as IPermissionRequest;
  const result = await PermissionService.createUserPermission(tenantDomain, userId, permissionData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'User permission created successfully',
    data: result,
  });
});

export const updateRolePermissions = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;
  const userId = req.params.userId;
  const permissionId = req.params.id;
  const permissions = req.body as IPermissionRequest[];
  const result = await PermissionService.updateUserPermission(
    tenantDomain,
    userId,
    permissionId,
    permissions
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Role permissions updated successfully',
    data: result,
  });
});


const getMyPermissions = catchAsync(async (req, res) => {
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

const getSinglePermission = catchAsync(async(req, res)=>{
      const { id } = req.params;
      const tenantDomain = req.query.tenantDomain as string;
      const result = await PermissionService.getSinglePermission(tenantDomain, id);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission checked successfully',
    data: { hasPermission: result },
  });
})
const deleteUserPermission = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;
  const userId = req.params.userId;
  const permissionId = req.params.id;

  const result = await PermissionService.deleteUserPermission(
    tenantDomain,
    userId,
    permissionId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission deleted successfully',
    data: result,
  });
});

const updateMultiplePermissions = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;
  const permissionUpdates = req.body; 
  const result = await PermissionService.updateMultiplePermissions(tenantDomain, permissionUpdates);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permissions updated successfully',
    data: result,
  });
});

export const createMultiplePermissions = async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;

  const permissionData = req.body;

  if (!Array.isArray(permissionData)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'permissionData must be an array');
  }
  
  const result = await PermissionService.createOrUpdateMultiplePermissions(tenantDomain, permissionData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Permissions created successfully',
    data: result,
  });
};


export const PermissionController = {
  getUserPermissions,
  createUserPermission,
  updateRolePermissions,
  getMyPermissions,
  getSinglePermission,
  deleteUserPermission,
  updateMultiplePermissions,
  createMultiplePermissions
};