import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { companyBrandServices } from './service';

const createCompanyBrand = catchAsync(async (req, res) => {
  const result = await companyBrandServices.createCompanyBrand(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'CompanyBrand created successfully',
    data: result,
  });
});

const getAllCompanyBrands = catchAsync(async (req, res) => {
  const result = await companyBrandServices.getAllCompanyBrands(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'CompanyBrands retrieved successfully',
    data: result,
  });
});


const deleteCompanyBrand = catchAsync(async (req, res) => {
  const result = await companyBrandServices.deleteCompanyBrand(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'CompanyBrand deleted successfully',
    data: result,
  });
});

export const companyBrandControllers = {
  createCompanyBrand,
  getAllCompanyBrands,
  deleteCompanyBrand,
};
