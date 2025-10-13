import httpStatus from 'http-status';

import { AuthServices } from './auth.service';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';

export const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUser(req.body);
  const { accessToken, refreshToken, user } = result;

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions: any = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: "/",
  };
  if (isProduction) {
    cookieOptions.domain = ".trustautosolution.com";
  }

  // Set cookies
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Login successful!",
    data: { user, accessToken, refreshToken },
  });
});


 const logoutUser = catchAsync(async (req, res) => {
  const result = await AuthServices.logoutUser();

  // const domain =
  //   process.env.NODE_ENV === "production"
  //     ? ".trustautosolution.com"
  //     : ".localhost";

  // // Clear cookies securely
  // res.clearCookie("accessToken", { httpOnly: true, secure: false, domain, path: "/" });
  // res.clearCookie("refreshToken", { httpOnly: true, secure: false, domain, path: "/" });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data:null
  });
});

 const tokenVerify = catchAsync(async (req, res) => {
  const token = req.cookies.accessToken;
  console.log("token check this ", token);

  if (!token) {
    throw new AppError(401, "Not authenticated");
  }

  const payload = AuthServices.verifyAccessToken(token);

  if (typeof payload === "string") {
    throw new AppError(401, "Invalid token format");
  }

  sendResponse(res, {
  statusCode: 200,
  success: true,
  message: "User info fetched successfully",
  data: {
    userId: payload.userId,
    name: payload.name,
    role: payload.role,
    tenantDomain: payload.tenantDomain,
    tenantId: payload.tenantId,
    accessToken: token,
  },
});

});

export const AuthController = {
  loginUser,
  logoutUser,
  tokenVerify

};
