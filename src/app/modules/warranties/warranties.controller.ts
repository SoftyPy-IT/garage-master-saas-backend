import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { WarrantyServices } from './warranties.service';

const createWarranty = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;

  const result = await WarrantyServices.createWarranty(req.body, tenantDomain);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Warranty created successfully',
    data: result,
  });
});

const getAllWarranty = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;
  const result = await WarrantyServices.getAllWarranty(tenantDomain, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Warranties retrieved successfully',
    data: result,
  });
});

const getSingleWarranty = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  const result = await WarrantyServices.getSingleWarranty(tenantDomain, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Warranty retrieved successfully',
    data: result,
  });
});

const deleteWarranty = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  const result = await WarrantyServices.deleteWarranty(tenantDomain, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Warranty deleted successfully',
    data: result,
  });
});

const updateWarranty = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  const payload = req.body;

  const result = await WarrantyServices.updateWarranty(
    tenantDomain,
    id,
    payload,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Warranty updated successfully',
    data: result,
  });
});

export const WarrantyController = {
  createWarranty,
  getAllWarranty,
  getSingleWarranty,
  deleteWarranty,
  updateWarranty,
};
