import httpStatus from 'http-status';
import { UserServices } from './user.service';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

const createUser = catchAsync(async (req, res) => {
  const result = await UserServices.createUser(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User is created successfully this is new',
    data: result,
  });
});

const getAllUser = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;
  const result = await UserServices.getAllUser(tenantDomain);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users are retrieved successfully',
    data: result,
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  const result = await UserServices.deleteUser(tenantDomain, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User deleted successfully',
    data: result,
  });
});
const updateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  const payload = req.body;

  const result = await UserServices.updateUser(tenantDomain, id, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User updated successfully',
    data: result,
  });
});

export const UserController = {
  createUser,
  getAllUser,
  deleteUser,
  updateUser,
};


