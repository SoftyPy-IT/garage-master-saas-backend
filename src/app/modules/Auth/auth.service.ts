/* eslint-disable @typescript-eslint/no-unused-vars */
import httpStatus from 'http-status';

import { TLoginUser } from './auth.interface';
import { createToken } from './auth.utils';
import config from '../../config';
import bcrypt from 'bcrypt';
import { JwtPayload } from 'jsonwebtoken';
import AppError from '../../errors/AppError';
import { User, userSchema } from '../user/user.model';
import { connectToTenantDatabase } from '../../../server';
import { Tenant } from '../tenant/tenant.model';
import jwt from "jsonwebtoken";


export const loginUser = async (payload: TLoginUser) => {

  if (payload.tenantDomain === 'superadmin') {
    const user = await User.findOne({ name: payload.name, role: 'superadmin' }).select('+password');

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "Super admin not found!");
    }

    const isPasswordMatch = await bcrypt.compare(payload.password, user.password);

    if (!isPasswordMatch) {
      throw new AppError(httpStatus.FORBIDDEN, "Password doesn't match!");
    }

    const jwtPayload = {
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      tenantDomain:user.tenantDomain
    };

    if (!config.jwt_access_secret || !config.jwt_refresh_secret) {
      throw new Error('JWT secrets are not defined in config');
    }
    const accessToken = createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string);
    const refreshToken = createToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expires_in as string);

    return {
      accessToken,
      refreshToken,
      user: {
        userId: user._id,
        name: user.name,
        role: user.role,
      },
    };
  }

  // for this auth check all tenant user 
  const tenant = await Tenant.findOne({ domain: payload.tenantDomain });
  if (!tenant || !tenant.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tenant not found or inactive');
  }

  if (!tenant.subscription || !tenant.subscription.isPaid || !tenant.subscription.isActive) {
    throw new AppError(httpStatus.FORBIDDEN, 'Subscription is inactive or not paid');
  }

  const now = new Date() 
  const subscriptionEnd = new Date(tenant.subscription.endDate);

  if( now > subscriptionEnd ){
    throw new AppError(httpStatus.FORBIDDEN, 'Subscription has expired !')
  }

  const tenantConnection = await connectToTenantDatabase(
    tenant._id.toString(),
    tenant.dbUri
  );

  const TenantUser = tenantConnection.model('User', userSchema);
  const user = await TenantUser.findOne({ name: payload.name }).select('+password');

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User name doesn't match!");
  }

  if (user?.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This account has been deleted!');
  }

  const isPasswordMatch = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordMatch) {
    throw new AppError(httpStatus.FORBIDDEN, "Password doesn't match!");
  }

  const jwtPayload = {
    userId: user._id.toString(),
    role: user.role,
    name: user.name,
    tenantId: tenant._id.toString(),
  };

  const accessToken = createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string);
  const refreshToken = createToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expires_in as string);

  return {
    accessToken,
    refreshToken,
    user: {
      userId: user._id,
      name: user.name,
      role: user.role,
      tenantId: tenant._id,
    },
  };
};



export const logoutUser = async () => {
  return { message: 'Logged out successfully!' };
};

export const verifyAccessToken = (token: string) => {
  if (!config.jwt_access_secret) throw new Error("JWT Access Secret not defined");
  try {
    return jwt.verify(token, config.jwt_access_secret);
  } catch (err) {
    throw new AppError(401, "Invalid or expired token");
  }
};


export const AuthServices = {
  loginUser,
  logoutUser,
  verifyAccessToken

};
