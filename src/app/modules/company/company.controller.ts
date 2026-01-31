import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CompanyServices } from './company.service';
import { Request, Response } from 'express';

const createCompany = catchAsync(async (req: Request, res: Response) => {
  const { tenantDomain } = req.body;

  const company = await CompanyServices.createCompanyDetails(
    tenantDomain,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Company created successful!',
    data: company,
  });
});

const getAllCompanies = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit as string);
  const page = parseInt(req.query.page as string);
  const isRecycled = req.query.isRecycled as string;
  const searchTerm = req.query.searchTerm as string;
  const tenantDomain = req.query.tenantDomain as string;
  const result = await CompanyServices.getAllCompanyFromDB(
    limit,
    page,
    searchTerm,
    isRecycled,
    tenantDomain,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Company are retrieved successful',
    data: result,
  });
});

const getSingleCompanyDetails = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  //  const tenantDomain = req.headers.host || '';
  const result = await CompanyServices.getSingleCompanyDetails(
    tenantDomain,
    id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Company retrieved successful!',
    data: result,
  });
});

const updateCompany = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { tenantDomain } = req.body;
  const service = await CompanyServices.updateCompany(
    tenantDomain,
    id,
    req.body,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Company update successful!',
    data: service,
  });
});
const deleteCompany = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  const service = await CompanyServices.deleteCompany(tenantDomain, id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Company deleted successful!',
    data: service,
  });
});

const permanantlyDeleteCompany = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  const service = await CompanyServices.permanantlyDeleteCompany(
    tenantDomain,
    id,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Company permanantly deleted successful!',
    data: service,
  });
});
const moveToRecyledbinCompany = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  const service = await CompanyServices.moveToRecyledbinCompany(
    tenantDomain,
    id,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Company move to recycled bin successful!',
    data: service,
  });
});

const restoreFromRecyledbinCompany = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  const service = await CompanyServices.restoreFromRecyledbinCompany(
    tenantDomain,
    id,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Restore Company successful!',
    data: service,
  });
});

const moveAllToRecycledBinMoneyReceipts = catchAsync(async (req, res) => {
  const result = await CompanyServices.moveAllToRecycledBin();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `${result.modifiedCount} company moved to the recycle bin successfully.`,
    data: null,
  });
});
const restoreAllFromRecycledBinMoneyReceipts = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;
  const result = await CompanyServices.restoreAllFromRecycledBin();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `${result.modifiedCount} company restored successfully.`,
    data: null,
  });
});
export const companyController = {
  createCompany,
  getAllCompanies,
  getSingleCompanyDetails,
  deleteCompany,
  updateCompany,
  restoreFromRecyledbinCompany,
  moveToRecyledbinCompany,
  permanantlyDeleteCompany,
  restoreAllFromRecycledBinMoneyReceipts,
  moveAllToRecycledBinMoneyReceipts,
};
