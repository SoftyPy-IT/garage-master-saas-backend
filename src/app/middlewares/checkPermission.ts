import { Request, Response, NextFunction } from 'express';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';

/**
 * @param pageRoute - The page path (e.g. '/dashboard/update-customer')
 * @param action - One of 'view' | 'create' | 'edit' | 'delete'
 */
export const checkPermission = (pageRoute: string, action: 'view' | 'create' | 'edit' | 'delete') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).userData;

    if (!user) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'User not found in request');
    }

    const permissions = user.permission || [];

    // Find permission for the page
    const pagePermission = permissions.find((perm: any) => {
      const page = perm.pageId?.[0];
      return (
        page &&
        (page.path === pageRoute || page.route === pageRoute)
      );
    });

    if (!pagePermission) {
      throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission for this page');
    }

    // Check if the requested action is allowed
    const isAllowed = pagePermission[action];
    if (!isAllowed) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `You do not have ${action.toUpperCase()} permission on this page`
      );
    }

    next();
  };
};
