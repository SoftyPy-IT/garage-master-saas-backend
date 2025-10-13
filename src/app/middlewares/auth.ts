import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import AppError from '../errors/AppError';
import catchAsync from '../utils/catchAsync';
import config from '../config';
import { getTenantModel } from '../utils/getTenantModels';
const checkPagePermission = (user: any, pagePath: string, action: string): boolean => {
  if (!user.permission || !Array.isArray(user.permission)) {
    return false;
  }

  const permission = user.permission.find((p: any) => {
    if (!p.pageId || !Array.isArray(p.pageId) || p.pageId.length === 0) {
      return false;
    }

    const page = p.pageId[0];
    if (!page) return false;

    const possiblePaths = [
      pagePath,
      pagePath.endsWith('/') ? pagePath.slice(0, -1) : pagePath + '/',
      pagePath.startsWith('/') ? pagePath : '/' + pagePath,
    ];

    return (
      possiblePaths.includes(page.path) ||
      possiblePaths.includes(page.route)
    );
  });

  if (permission && permission[action] === true) {
    return true;
  }

  return false;
};

export const auth = (...requiredRoles: string[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new AppError(401, 'You are not authorized! Please login');

    const decoded = jwt.verify(token, config.jwt_access_secret as string) as JwtPayload;
    const { userId, tenantId, role, iat, tenantDomain } = decoded;

    if (!tenantId) throw new AppError(401, 'Tenant info missing in token');
    const { Model: UserModel } = await getTenantModel(tenantId, 'User');
    const { Model: Permission } = await getTenantModel('trustautosolution.com', 'Permission');
    const { Model: Page } = await getTenantModel('trustautosolution.com', 'Page');

    const user = await UserModel.findById(userId)
      .select('+password')
      .populate({
        path: 'permission',
        model: Permission,
        populate: { path: 'pageId', model: Page },
      });
    if (!user) throw new AppError(404, 'User not found');
    if (user.status === 'inactive') throw new AppError(403, 'User inactive');
    if (user.passwordChangeAt && new Date(user.passwordChangeAt).getTime() / 1000 > (iat as number)) {
      throw new AppError(401, 'Password recently changed');
    }


    if (requiredRoles.length && !requiredRoles.includes(role)) {
      throw new AppError(403, 'Access Denied');
    }

    req.user = decoded;
    req.tenantId = tenantId;
    req.fullUser = user;
    next();
  });
};

export const checkPermission = (pagePath: string, action: string) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.fullUser;

    if (!user) {
      throw new AppError(401, 'User not authenticated');
    }

    const hasPermission = checkPagePermission(user, pagePath, action);

    if (!hasPermission) {
      throw new AppError(403, `You don't have permission to ${action} this page`);
    }

    next();
  });
};