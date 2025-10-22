import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { EmployeeServices } from './employee.service';

const createEmployee = catchAsync(async (req, res) => {
   const {tenantDomain} = req.body
  const result = await EmployeeServices.createEmployeeIntoDB(tenantDomain, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Employee created successful!',
    data: result,
  });
});

const getAllEmployees = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit as string);
  const page = parseInt(req.query.page as string);
 const tenantDomain = req.query.tenantDomain as string;
  const searchTerm = req.query.searchTerm as string;

  const result = await EmployeeServices.getAllEmployeesFromDB(
    tenantDomain,
    limit,
    page,
    searchTerm,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Employees are retrieved successful',
    data: result,
  });
});

const getSingleEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;
 const tenantDomain = req.query.tenantDomain as string;
  const result = await EmployeeServices.getSingleEmployeeDetails(tenantDomain, id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Employee retrieved successful!',
    data: result,
  });
});

const updateEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;
 const {tenantDomain} = req.body
 
  const employee = await EmployeeServices.updateEmployeeIntoDB(tenantDomain, id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Employee update successful!',
    data: employee,
  });
});

const deleteEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;
 const tenantDomain = req.query.tenantDomain as string;
  const employee = await EmployeeServices.deleteEmployee(tenantDomain, id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Employee deleted successful!',
    data: employee,
  });
});
const restoreFromRecycledEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;
 const tenantDomain = req.query.tenantDomain as string;
  const employee = await EmployeeServices.restoreFromRecycledEmployee(tenantDomain , id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Employee restore from recycled bin successful!',
    data: employee,
  });
});
const permanentlyDeleteEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;
 const tenantDomain = req.query.tenantDomain as string;
  const employee = await EmployeeServices.permanentlyDeleteEmployee(tenantDomain, id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Employee permanantly deleted successful!',
    data: employee,
  });
});
const moveToRecycledEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;
 const tenantDomain = req.query.tenantDomain as string;
  const employee = await EmployeeServices.moveToRecycledEmployee(tenantDomain, id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Employee move to recycled bin successful!',
    data: employee,
  });
});
const moveAllToRecycledBinMoneyReceipts = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;     
  const result = await EmployeeServices.moveAllToRecycledBin(tenantDomain);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `${result.modifiedCount} company moved to the recycle bin successfully.`,
    data: null,
  });
});
const restoreAllFromRecycledBinMoneyReceipts = catchAsync(async (req, res) => {
   const tenantDomain = req.query.tenantDomain as string;
  const result = await EmployeeServices.restoreAllFromRecycledBin(tenantDomain);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `${result.modifiedCount} company restored successfully.`,
    data: null,
  });
});
export const employeeController = {
  createEmployee,
  getAllEmployees,
  getSingleEmployee,
  updateEmployee,
  deleteEmployee,
  permanentlyDeleteEmployee,
  moveToRecycledEmployee,
  restoreFromRecycledEmployee,
  moveAllToRecycledBinMoneyReceipts,
  restoreAllFromRecycledBinMoneyReceipts,
};
