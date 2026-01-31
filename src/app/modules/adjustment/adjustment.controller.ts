import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { adjustmentServices } from './adjustment.service';

const createAdjustment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const result = await adjustmentServices.createAdjustment(
      tenantDomain,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Adjustment created successfully',
      data: result,
    });
  } catch (err: any) {
    console.error('Error in controller:', err.message);
    next(err);
  }
};

const getAllAdjustment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const result = await adjustmentServices.getAllAdjustment(
      tenantDomain,
      req.query,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Adjustment are retrieved succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const getSingleAdjustment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const result = await adjustmentServices.getSinigleAdjustment(
      tenantDomain,
      id,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Adjustment is retrieved succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const deleteAdjustment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const result = await adjustmentServices.deleteAdjustment(tenantDomain, id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Adjustment deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const updateAdjustment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const result = await adjustmentServices.updateAdjustment(
      tenantDomain,
      id,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Adjustment update succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const adjustmentControllers = {
  getAllAdjustment,
  getSingleAdjustment,
  deleteAdjustment,
  updateAdjustment,
  createAdjustment,
};
