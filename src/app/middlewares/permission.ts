import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import Page from '../modules/page/page.model';
import Role from '../modules/role/role.model';

const permission = (action: 'create' | 'edit' | 'view' | 'delete') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user from request (set by auth middleware)
      const user = req.user;
      if (!user) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
      }

      // Get current path
      const path = req.baseUrl + req.route.path;

      // Skip permission check for admin
      if (user.role === 'admin') {
        return next();
      }

      // Get page by path
      const page = await Page.findOne({ path });
      if (!page) {
        throw new AppError(httpStatus.NOT_FOUND, 'Page not found!');
      }

      // Get user role with permissions
      const role = await Role.findById(user.roleId);
      if (!role) {
        throw new AppError(httpStatus.NOT_FOUND, 'Role not found!');
      }

      // Check if the role has permission for the page
      const pagePermission = role.permissions.find(
        (p) => p.pageId.toString() === page._id.toString(),
      );

      if (!pagePermission) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'You do not have permission to access this resource!',
        );
      }

      // Check if the role has permission for the action
      if (!pagePermission[action]) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          `You do not have ${action} permission for this resource!`,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default permission;
