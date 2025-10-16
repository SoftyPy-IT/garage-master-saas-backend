import { NextFunction, Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../errors/AppError";


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