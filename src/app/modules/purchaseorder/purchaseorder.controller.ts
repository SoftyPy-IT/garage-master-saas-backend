import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { purchaseOrderServices } from './purchaseorder.service';

const createPurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = req.body;
    const { tenantDomain } = req.body;
    const result = await purchaseOrderServices.createPurchaseOrder(
      tenantDomain,
      payload,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase order created successfully',
      data: result,
    });
  } catch (err: any) {
    console.error('Error in controller:', err.message);
    next(err);
  }
};

const getAllPurchaseOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;

    const result = await purchaseOrderServices.getAllPurchaseOrders(
      tenantDomain,
      req.query,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase orders retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getSinglePurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const tenantDomain = req.query.tenantDomain as string;

    const result = await purchaseOrderServices.getSinglePurchaseOrder(
      tenantDomain,
      id,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase order retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const updatePurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const result = await purchaseOrderServices.updatePurchaseOrder(
      tenantDomain,
      id,
      req.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase order updated successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const deletePurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const result = await purchaseOrderServices.deletePurchaseOrder(
      tenantDomain,
      id,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase order deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const purchaseOrderControllers = {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getSinglePurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
};
