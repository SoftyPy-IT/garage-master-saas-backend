import { NextFunction, Request, Response } from 'express';

import httpStatus from 'http-status';

import sendResponse from '../../utils/sendResponse';
import { brandServices } from './brand.service';

const createBrand = async (req: Request, res: Response, next: NextFunction) => {
  try {
     const { tenantDomain } = req.body;

    const result = await brandServices.createBrand(tenantDomain, req.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Brand created successfully',
      data: result,
    });
  } catch (err: any) {
    console.error('Error in controller:', err.message);
    next(err);
  }
};

const getAllBrand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantDomain =
      (req.headers['x-tenant-domain'] as string) ||
      (req.query.tenantDomain as string) ||
      req.headers.host ||
      '';

    const result = await brandServices.getAllBrand(tenantDomain,req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Brand are retrieved succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const getSingleBrand = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const result = await brandServices.getSinigleBrand(tenantDomain, id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Brand is retrieved succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const deleteBrand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const result = await brandServices.deleteBrand(tenantDomain, id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Brand deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const updateBrand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
     const { tenantDomain } = req.body;

    const result = await brandServices.updateBrand(tenantDomain,id, req.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Brand update succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const brandControllers = {
  getAllBrand,
  getSingleBrand,
  deleteBrand,
  updateBrand,
  createBrand,
};
