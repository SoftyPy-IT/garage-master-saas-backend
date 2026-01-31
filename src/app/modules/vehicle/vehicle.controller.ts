import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { VehicleServices } from './vehicle.service';

const createVehicle = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;
  const customer = await VehicleServices.createVehicleDetails(
    tenantDomain,
    req.body,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Vehicle created successful!',
    data: customer,
  });
});

const getAllVehicles = catchAsync(async (req, res) => {
  const id = req.query.id as string;
  const limit = parseInt(req.query.limit as string) || 10;
  const page = parseInt(req.query.page as string) || 1;
  const tenantDomain = req.query.tenantDomain as string;
  // const tenantDomain = req.headers.host || '';

  const searchTerm = (req.query.searchTerm as string) || '';

  const result = await VehicleServices.getAllVehiclesFromDB(
    tenantDomain,
    id,
    limit,
    page,
    searchTerm,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Vehicles retrieved successfully',
    data: result,
  });
});

const getSingleVehicle = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;

  const result = await VehicleServices.getSingleVehicleDetails(
    tenantDomain,
    id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Vehicle retrieved successful!',
    data: result,
  });
});

const deleteVehicle = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  const service = await VehicleServices.deleteVehicle(tenantDomain, id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Vehicle deleted successful!',
    data: service,
  });
});

const updateVehicle = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;

  const updated = await VehicleServices.updateVehicleDetails(
    tenantDomain,
    id,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Vehicle updated successfully!',
    data: updated,
  });
});

export const vehicleController = {
  createVehicle,
  getAllVehicles,
  getSingleVehicle,
  deleteVehicle,
  updateVehicle,
};
