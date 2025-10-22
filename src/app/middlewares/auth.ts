// src/middlewares/auth.ts
import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import AppError from '../errors/AppError';
import catchAsync from '../utils/catchAsync';
import config from '../config';
import { getTenantModel } from '../utils/getTenantModels';
import { redisClient } from '../utils/redis';

const getUserCacheKey = (domain: string, userId: string) => `user:${domain}:${userId}:data`;

export const auth = (...requiredRoles: string[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new AppError(401, 'You are not authorized! Please login');

    const decoded = jwt.verify(token, config.jwt_access_secret as string) as JwtPayload;
    const { userId, tenantId, role, iat, domain } = decoded;

    if (!tenantId) throw new AppError(401, 'Tenant info missing in token');

    // user check from redis
    const userCacheKey = getUserCacheKey(domain, userId);
    let user = null;
    const cachedUser = await redisClient.get(userCacheKey);

    if (cachedUser) {
      user = JSON.parse(cachedUser);

    } else {
      const { Model: UserModel } = await getTenantModel(domain, 'User');
      const { Model: Permission } = await getTenantModel(domain, 'Permission');
      const { Model: Page } = await getTenantModel(domain, 'Page');

      const dbUser = await UserModel.findById(userId)
        .select('+password')
        .populate({
          path: 'permission',
          model: Permission,
          populate: { path: 'pageId', model: Page },
        });

      if (!dbUser) throw new AppError(404, 'User not found');
      if (dbUser.status === 'inactive') throw new AppError(403, 'User inactive');
      if (dbUser.passwordChangeAt && new Date(dbUser.passwordChangeAt).getTime() / 1000 > (iat as number)) {
        throw new AppError(401, 'Password recently changed');
      }

      user = dbUser;
      try {
        const userObj = user.toObject();
        const { password, ...userWithoutPassword } = userObj;

        await redisClient.set(userCacheKey, JSON.stringify(userWithoutPassword), 900);
      } catch (error) {
        console.error('Error from redis data :', error);
      }
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

// remove user permission from cache
export const invalidateUserPermissionCache = async (domain: string, userId: string) => {
  await redisClient.invalidateUserCache(domain, userId);
};

// all user permission cache remove
export const invalidateAllUserPermissionCache = async (domain: string) => {
  await redisClient.invalidateAllUserCache(domain);
};