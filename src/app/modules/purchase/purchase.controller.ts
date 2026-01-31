import { NextFunction, Request, Response } from 'express';

import httpStatus from 'http-status';

import sendResponse from '../../utils/sendResponse';
import { purchaseServices } from './purchase.service';

const createPurchase = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = req.body;
    const { tenantDomain } = req.body;

    const result = await purchaseServices.createPurchase(tenantDomain, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase created successfully',
      data: result,
    });
  } catch (err: any) {
    console.error('Error in controller:', err.message);
    next(err);
  }
};

const getAllPurchase = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;

    const result = await purchaseServices.getAllPurchase(
      tenantDomain,
      req.query,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase are retrieved succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const getSinglePurchase = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;

    const result = await purchaseServices.getSinglePurchase(tenantDomain, id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase is retrieved succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const deletePurchase = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;

    const result = await purchaseServices.deletePurchase(tenantDomain, id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const updatePurchase = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { tenantDomain } = req.body;

    const result = await purchaseServices.updatePurchase(
      tenantDomain,
      id,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase update succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const purchaseControllers = {
  getAllPurchase,
  getSinglePurchase,
  deletePurchase,
  updatePurchase,
  createPurchase,
};
