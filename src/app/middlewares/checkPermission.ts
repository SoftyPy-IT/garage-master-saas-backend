// src/middlewares/checkPermission.ts
import { NextFunction, Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../errors/AppError";
import { redisClient } from "../utils/redis";

const getPermissionCheckCacheKey = (domain: string, userId: string, pagePath: string, action: string) =>
  `permission:${domain}:check:${userId}:${pagePath}:${action}`;

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

export const checkPermission = (pagePath: string, action: string) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.fullUser;
    const domain = (req.user as any)?.domain;

    if (!user) {
      throw new AppError(401, 'User not authenticated');
    }
    const cacheKey = getPermissionCheckCacheKey(domain, user._id, pagePath, action);

    try {
      const cachedResult = await redisClient.get(cacheKey);

      if (cachedResult !== null) {
        const hasPermission = cachedResult === 'true';
        if (!hasPermission) {
          throw new AppError(403, `You don't have permission to ${action} this page`);
        }
        return next();
      }
    } catch (error) {
      console.error('Permission check from redis', error);
    }

    const hasPermission = checkPagePermission(user, pagePath, action);

    try {
      await redisClient.set(cacheKey, hasPermission.toString(), 300);
    } catch (error) {
      console.error('permission check error from redis', error);
    }

    if (!hasPermission) {
      throw new AppError(403, `You don't have permission to ${action} this page`);
    }

    next();
  });
};