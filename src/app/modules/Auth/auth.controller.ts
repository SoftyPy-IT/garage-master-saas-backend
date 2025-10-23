import httpStatus from 'http-status';

import { AuthServices } from './auth.service';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import jwt from 'jsonwebtoken';
import config from '../../config';


const cookieOptions: any = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "none",
  path: "/",
};
if (process.env.NODE_ENV === "production") cookieOptions.domain = ".moriyom.com";


// export const loginUser = catchAsync(async (req, res) => {
//   const result = await AuthServices.loginUser(req.body);
//   const { accessToken, refreshToken, user } = result;

//   const isProduction = process.env.NODE_ENV === "production";
//   const cookieOptions: any = {
//     httpOnly: true,
//     secure: true,
//     sameSite: 'none',
//     path: "/",
//   };
//   if (isProduction) {
//     cookieOptions.domain = ".moriyom.com";
//   }

//   // Set cookies
//   res.cookie("accessToken", accessToken, {
//     ...cookieOptions,
//     maxAge: 24 * 60 * 60 * 1000,
//   });

//   res.cookie("refreshToken", refreshToken, {
//     ...cookieOptions,
//     maxAge: 7 * 24 * 60 * 60 * 1000,
//   });

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Login successful!",
//     data: { user, accessToken, refreshToken },
//   });
// });


import { URL } from 'url';

export const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUser(req.body);
  const { accessToken, refreshToken, user } = result;

  const origin = req.headers.origin;
  const isProduction = process.env.NODE_ENV === 'production';

  let cookieDomain: string | undefined = undefined;

  if (isProduction && origin) {
    try {
      const hostname = new URL(origin).hostname;
      const parts = hostname.split('.');
      if (parts.length > 2) {
        cookieDomain = `.${parts.slice(-2).join('.')}`;
      } else {
        cookieDomain = `.${hostname}`;
      }
    } catch (err) {
      console.error('Error parsing cookie domain:', err);
    }
  }

  const cookieOptions: any = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };

  if (cookieDomain) {
    cookieOptions.domain = cookieDomain;
  }

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Login successful!',
    data: { user, accessToken, refreshToken },
  });
});


export const logoutUser = catchAsync(async (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: "/",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: "/",
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Logged out successfully!",
    data: null,
  });
});

export const refreshToken = catchAsync(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new AppError(401, "No refresh token found");

  let payload;
  try {
    payload = jwt.verify(token, config.jwt_refresh_secret as string);
    if (typeof payload === "string") throw new AppError(401, "Invalid payload");
  } catch (err) {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  const accessToken = AuthServices.createAccessToken(payload);
  res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 30 * 1000 });
  sendResponse(res, { statusCode: 200, success: true, message: "Access token refreshed", data: { accessToken } });
});

export const tokenVerify = catchAsync(async (req, res) => {
  let token = req.cookies.accessToken;

  try {
    if (!token) throw new Error("No access token");

    const payload = AuthServices.verifyAccessToken(token);

    if (typeof payload === "string") throw new AppError(401, "Invalid token payload");

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "User info fetched",
      data: { ...payload, accessToken: token },
    });
  } catch (err) {
    // Try refresh token
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw new AppError(401, "Not authenticated");

    const payload = jwt.verify(refreshToken, config.jwt_refresh_secret as string);
    if (typeof payload === "string") throw new AppError(401, "Invalid refresh token payload");

    const newAccessToken = AuthServices.createAccessToken(payload);
    res.cookie("accessToken", newAccessToken, { ...cookieOptions, maxAge: 30 * 1000 });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "User info fetched",
      data: { ...payload, accessToken: newAccessToken },
    });
  }
});



export const AuthController = {
  loginUser,
  logoutUser,
  tokenVerify,
  refreshToken

};
