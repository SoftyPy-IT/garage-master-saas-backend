// import { NextFunction, Request, Response } from 'express';
// import httpStatus from 'http-status';
// import jwt, { JwtPayload } from 'jsonwebtoken';
// import AppError from '../errors/AppError';
// import catchAsync from '../utils/catchAsync';
// import { User } from '../modules/user/user.model';
// import { TUserRole } from '../modules/user/user.interface';
// import config from '../config';

// export const auth = (...requiredRoles: TUserRole[]) => {
//   return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//     const token = req.headers.authorization;
//     if (!token) {
//       throw new AppError(
//         httpStatus.UNAUTHORIZED,
//         'You are not authorized! Please login to get access',
//       );
//     }

//     const decoded = jwt.verify(
//       token,
//       config.jwt_access_secret as string,
//     ) as JwtPayload;

//     const { role, userId, iat } = decoded;
//     const user = await User.findOne({ _id: userId });

//     if (!user) {
//       throw new AppError(httpStatus.NOT_FOUND, 'User not found');
//     }

//     if (user?.status === 'inactive') {
//       throw new AppError(httpStatus.FORBIDDEN, 'User is inactive');
//     }

//     if (
//       user.passwordChangeAt &&
//       User.isJWTIssuedBeforePasswordChanged(
//         user.passwordChangeAt,
//         iat as number,
//       )
//     ) {
//       throw new AppError(httpStatus.UNAUTHORIZED, 'Password recently changed');
//     }

//     if (requiredRoles.length && !requiredRoles.includes(role)) {
//       throw new AppError(httpStatus.FORBIDDEN, 'Access Denied');
//     }

//     req.user = decoded as JwtPayload;
//     next();
//   });
// };
