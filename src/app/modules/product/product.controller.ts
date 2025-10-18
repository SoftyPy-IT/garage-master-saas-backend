import { NextFunction, Request, Response } from 'express';

import httpStatus from 'http-status';

import sendResponse from '../../utils/sendResponse';
import { productServices } from './product.service';
import mongoose from 'mongoose';

const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {

  const { tenantDomain } = req.body;
  try {
    const file = req.file;
    const payload = req.body;
    if (payload.data) {
      Object.assign(payload, JSON.parse(payload.data));
      delete payload.data;
    }

    const result = await productServices.createProduct(tenantDomain, payload, file);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Product created successfully',
      data: result,
    });
  } catch (err: any) {
    console.error('Error in controller:', err.message);
    next(err);
  }
};


const getAllProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;

    const result = await productServices.getAllProduct(tenantDomain, req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Product are retrieved succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const getSingleProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const result = await productServices.getSingleProduct(tenantDomain, id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Product is retrieved succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const { id } = req.params;
    const result = await productServices.deleteProduct(tenantDomain, id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Product deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;


    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID',
      });
    }
    const { tenantDomain } = req.body;
    const result = await productServices.updateProduct(tenantDomain, id, req.body);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Product updated successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const productControllers = {
  getAllProduct,
  getSingleProduct,
  deleteProduct,
  updateProduct,
  createProduct,
};
