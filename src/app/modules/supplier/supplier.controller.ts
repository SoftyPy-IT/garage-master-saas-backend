import { NextFunction, Request, Response } from 'express';

import httpStatus from 'http-status';

import sendResponse from '../../utils/sendResponse';
import { supplierServices } from './supplier.service';
import catchAsync from '../../utils/catchAsync';

export const createSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { tenantDomain } = req.body;
    const newSupplier = await supplierServices.createSupplier(
      tenantDomain,
      req.body,
    );

    return sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Supplier created successfully',
      data: newSupplier,
    });
  } catch (error: any) {
    console.error('Error in createSupplier controller:', error.message);
    next(error);
  }
};

export const getAllSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const suppliers = await supplierServices.getAllSupplier(
      tenantDomain,
      req.query,
    );

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Suppliers retrieved successfully',
      data: suppliers,
    });
  } catch (error) {
    console.error('Error in getAllSupplier controller:');
    next(error);
  }
};

export const getSingleSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const { id } = req.params;
    const supplier = await supplierServices.getSingleSupplier(tenantDomain, id);

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Supplier retrieved successfully',
      data: supplier,
    });
  } catch (error: any) {
    console.error('Error in getSingleSupplier controller:', error.message);
    next(error);
  }
};

export const getSupplierProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const { id } = req.params;
    const result = await supplierServices.getSupplierWithBillPayments(
      tenantDomain,
      id,
    );

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Supplier profile retrieved successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error in getSupplierProfile controller:', error.message);
    next(error);
  }
};
export const updateSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { tenantDomain } = req.body;
    const { id } = req.params;

    const updatedSupplier = await supplierServices.updateSupplier(
      tenantDomain,
      id,
      req.body,
    );
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Supplier updated successfully',
      data: updatedSupplier,
    });
  } catch (error: any) {
    console.error('Error in updateSupplier controller:', error.message);
    next(error);
  }
};

export const permanentlyDeleteSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const { id } = req.params;
    const result = await supplierServices.permanentlyDeleteSupplier(
      tenantDomain,
      id,
    );

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error: any) {
    console.error(
      'Error in permanentDeleteSupplier controller:',
      error.message,
    );
    next(error);
  }
};

export const moveToRecycledbinSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const { id } = req.params;
    const result = await supplierServices.moveToRecycledbinSupplier(
      tenantDomain,
      id,
    );

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Supplier moved to recycled bin successfully',
      data: result,
    });
  } catch (error: any) {
    console.error(
      'Error in moveToRecycledbinSupplier controller:',
      error.message,
    );
    next(error);
  }
};

export const restoreFromRecycledSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const { id } = req.params;
    const result = await supplierServices.restoreFromRecycledSupplier(
      tenantDomain,
      id,
    );

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Supplier restored successfully',
      data: result,
    });
  } catch (error: any) {
    console.error(
      'Error in restoreFromRecycledSupplier controller:',
      error.message,
    );
    next(error);
  }
};

export const recordSupplierPayment = catchAsync(async (req, res, next) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;

    const result = await supplierServices.recordSupplierPayment(
      tenantDomain,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Supplier payment recorded successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export const getSupplierPayments = catchAsync(async (req, res, next) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const { supplierId } = req.params;

    const result = await supplierServices.getSupplierPayments(
      tenantDomain,
      supplierId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Supplier payments retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export const recalcSupplierTotals = catchAsync(async (req, res, next) => {
  const tenantDomain = req.query.tenantDomain as string;
  const supplierId = req.params.supplierId;

  const result = await supplierServices.reCalcSupplierTotals(
    tenantDomain,
    supplierId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Supplier totals recalculated successfully',
    data: result,
  });
});

export const supplierController = {
  getAllSupplier,
  getSingleSupplier,
  updateSupplier,
  createSupplier,
  permanentlyDeleteSupplier,
  moveToRecycledbinSupplier,
  restoreFromRecycledSupplier,
  getSupplierProfile,
  recordSupplierPayment,
  getSupplierPayments,
  recalcSupplierTotals,
};
