
import bcrypt from "bcrypt";
import config from "../../config";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import { User, userSchema } from "../user/user.model";
import { Tenant } from "../tenant/tenant.model";
import { connectToTenantDatabase } from "../../../server";

import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";


export const loginUser = async (payload: any) => {
  // Superadmin login
  if (payload.tenantDomain === "superadmin") {
    const user = await User.findOne({ name: payload.name, role: "superadmin" }).select("+password");
    if (!user) throw new AppError(httpStatus.NOT_FOUND, "Super admin not found!");
    const match = await bcrypt.compare(payload.password, user.password);
    if (!match) throw new AppError(httpStatus.FORBIDDEN, "Password doesn't match!");

    const jwtPayload = {
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      domain: user.tenantDomain,
    };

    const accessToken = createAccessToken(jwtPayload);
    const refreshToken = createRefreshToken(jwtPayload);

    return { accessToken, refreshToken, user: { userId: user._id, name: user.name, role: user.role } };
  }

  // Tenant user login
  const tenant = await Tenant.findOne({ domain: payload.tenantDomain });
  if (!tenant || !tenant.isActive) throw new AppError(httpStatus.NOT_FOUND, "Tenant not found or inactive");

  if (!tenant.subscription?.isPaid || !tenant.subscription?.isActive) {
    throw new AppError(httpStatus.FORBIDDEN, "Subscription inactive or not paid");
  }

  if (new Date() > new Date(tenant.subscription.endDate)) {
    throw new AppError(httpStatus.FORBIDDEN, "Subscription has expired");
  }

  const tenantConn = await connectToTenantDatabase(tenant._id.toString(), tenant.dbUri);
  const TenantUser = tenantConn.model("User", userSchema);
  const user = await TenantUser.findOne({ name: payload.name }).select("+password");
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");
  if (user.isDeleted) throw new AppError(httpStatus.FORBIDDEN, "Account deleted");

  const match = await bcrypt.compare(payload.password, user.password);
  if (!match) throw new AppError(httpStatus.FORBIDDEN, "Password doesn't match");

  const jwtPayload = {
    userId: user._id.toString(),
    role: user.role,
    name: user.name,
    tenantId: tenant._id.toString(),
    domain: user.tenantDomain,
  };

  const accessToken = createAccessToken(jwtPayload);
  const refreshToken = createRefreshToken(jwtPayload);

  return {
    accessToken,
    refreshToken,
    user: { userId: user._id, name: user.name, role: user.role, tenantId: tenant._id },
  };
};

// Verify access token
export const verifyAccessToken = (token: string) => {
  if (!config.jwt_access_secret) throw new Error("JWT access secret not defined");
  try {
    return jwt.verify(token, config.jwt_access_secret);
  } catch (err) {
    throw new AppError(401, "Invalid or expired token");
  }
};


export const createAccessToken = (payload: object | JwtPayload): string => {
  if (!config.jwt_access_secret) throw new AppError(500, "JWT access secret not defined");

  const { iat, exp, ...rest } = payload as any;

  const options: SignOptions = {
    expiresIn: config.jwt_access_expires_in! as any,
  };

  return jwt.sign(rest, config.jwt_access_secret, options);
};

// Refresh token
export const createRefreshToken = (payload: object | JwtPayload): string => {
  if (!config.jwt_refresh_secret) throw new AppError(500, "JWT refresh secret not defined");

  const { iat, exp, ...rest } = payload as any;

  const options: SignOptions = {
    expiresIn: config.jwt_refresh_expires_in! as any,
  };

  return jwt.sign(rest, config.jwt_refresh_secret, options);
};


export const AuthServices = { loginUser, verifyAccessToken, createAccessToken, createRefreshToken };
