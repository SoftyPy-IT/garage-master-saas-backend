// src/modules/permission/permission.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PermissionService } from './permission.service';
import { IPermissionCheck, IUserPermissions } from './permission.interface';
import AppError from '../../errors/AppError';

/**
 * Check if a user has permission for a specific action on a page
 */
const checkPermission = catchAsync(async (req: Request, res: Response) => {
  const result = await PermissionService.checkPermission(
    req.body as IPermissionCheck,
  );

  sendResponse<{ hasPermission: boolean }>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission checked successfully',
    data: { hasPermission: result },
  });
});

/**
 * Get all permissions for a user
 */
const getUserPermissions = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId || (req.user?.userId as string);

  if (!userId) {
    sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'User ID is required',
      data: userId,
    });
    return;
  }

  const result = await PermissionService.getUserPermissions(userId);

  sendResponse<IUserPermissions>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User permissions retrieved successfully',
    data: result,
  });
});

/**
 * Update permissions for a role
 */
const updateRolePermissions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PermissionService.updateRolePermissions(
      req.params.roleId,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Role permissions updated successfully',
      data: result,
    });
  },
);

/**
 * Get current user's permissions
 */
const getMyPermissions = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not authenticated');
  }

  const result = await PermissionService.getUserPermissions(req.user.userId);

  sendResponse<IUserPermissions>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your permissions retrieved successfully',
    data: result,
  });
});

export const PermissionController = {
  checkPermission,
  getUserPermissions,
  updateRolePermissions,
  getMyPermissions,
};