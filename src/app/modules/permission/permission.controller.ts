
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

const getSinglePermission = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  const result = await PermissionService.getSinglePermission(tenantDomain, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission checked successfully',
    data: { hasPermission: result },
  });
});

const updateMultiplePermissions = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;
  const permissionUpdates = req.body;
  console.log('permission  update', req.body)
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
  console.log('permission check', permissionData);

  if (!Array.isArray(permissionData)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'permissionData must be an array');
  }

  const result = await PermissionService.createMultipleUserPermissions(tenantDomain, permissionData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Permissions created successfully',
    data: result,
  });
};

const getAllPermissions = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;

  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    role = '',
    searchTerm = ''
  } = req.query;

  const options = {
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc',
    role: role as string,
    searchTerm: searchTerm as string
  };

  const result = await PermissionService.getAllPermissions(tenantDomain, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All permissions retrieved successfully',
    data: result,
  });
});

export const deleteUserPermission = catchAsync(async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;
  const userId = req.params.userId;
  const permissionId = req.params.id;

  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User ID is required');
  }

  if (!permissionId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Permission ID is required');
  }

  const result = await PermissionService.deleteUserPermission(tenantDomain, userId, permissionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Permission deleted successfully',
    data: result.data,
  });
});

export const deleteMultipleUserPermissions = catchAsync(async (req: Request, res: Response) => {
  const tenantDomain = req.query.tenantDomain as string;
  const userId = req.params.userId;
  const { permissionIds } = req.body;
  console.log('user id check', userId);
  console.log(' Incoming body:', req.body);
  console.log(' Extracted permissionIds:', permissionIds);

  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User ID is required');
  }

  if (!permissionIds || !Array.isArray(permissionIds) || permissionIds.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Permission IDs array is required');
  }

  const result = await PermissionService.deleteMultipleUserPermissions(
    tenantDomain,
    userId,
    permissionIds
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || 'Permissions delete successfully',
    data: result.data,
  });
});

export const PermissionController = {
  getUserPermissions,
  createUserPermission,
  getMyPermissions,
  getSinglePermission,
  deleteMultipleUserPermissions,
  updateMultiplePermissions,
  createMultiplePermissions,
  getAllPermissions,
  deleteUserPermission
};