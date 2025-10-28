
import bcrypt from "bcrypt";
import config from "../../config";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import { User, userSchema } from "../user/user.model";
import { Tenant } from "../tenant/tenant.model";
import { connectToTenantDatabase } from "../../../server";

import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";


export const loginUser = async (payload: any) => {
  const { name, password } = payload;

  // Check if superadmin
  let user = await User.findOne({ name, role: "superadmin" }).select("+password");
  if (user) {
    const match = await bcrypt.compare(password, user.password);
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

  // Not superadmin → find user in all tenants
  const tenants = await Tenant.find({ isActive: true });
  for (const tenant of tenants) {
    if (!tenant.subscription?.isPaid || !tenant.subscription?.isActive) continue;
    if (new Date() > new Date(tenant.subscription.endDate)) continue;

    const tenantConn = await connectToTenantDatabase(tenant._id.toString(), tenant.dbUri);
    const TenantUser = tenantConn.model("User", userSchema);
    const tenantUser = await TenantUser.findOne({ name }).select("+password");

    if (tenantUser && !tenantUser.isDeleted) {
      const match = await bcrypt.compare(password, tenantUser.password);
      if (!match) throw new AppError(httpStatus.FORBIDDEN, "Password doesn't match");

      const jwtPayload = {
        userId: tenantUser._id.toString(),
        role: tenantUser.role,
        name: tenantUser.name,
        tenantId: tenant._id.toString(),
        domain: tenantUser.tenantDomain,
      };

      const accessToken = createAccessToken(jwtPayload);
      const refreshToken = createRefreshToken(jwtPayload);

      return {
        accessToken,
        refreshToken,
        user: { userId: tenantUser._id, name: tenantUser.name, role: tenantUser.role, tenantId: tenant._id, domain: tenant.domain },
      };
    }
  }

  throw new AppError(httpStatus.NOT_FOUND, "User not found");
};


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

export const createRefreshToken = (payload: object | JwtPayload): string => {
  if (!config.jwt_refresh_secret) throw new AppError(500, "JWT refresh secret not defined");

  const { iat, exp, ...rest } = payload as any;

  const options: SignOptions = {
    expiresIn: config.jwt_refresh_expires_in! as any,
  };

  return jwt.sign(rest, config.jwt_refresh_secret, options);
};


export const AuthServices = { loginUser, verifyAccessToken, createAccessToken, createRefreshToken };
