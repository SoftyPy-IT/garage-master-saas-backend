import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { purchaseReturnServices } from './purchasereturn.service';
import { getTenantModel } from '../../utils/getTenantModels';

const createPurchaseReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    const { tenantDomain } = req.body;

    const result = await purchaseReturnServices.createPurchaseReturn(tenantDomain, payload);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase return created successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getAllPurchaseReturns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const result = await purchaseReturnServices.getAllPurchaseReturns(tenantDomain, req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase returns retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getSinglePurchaseReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const { id } = req.params;
    const result = await purchaseReturnServices.getSinglePurchaseReturn(tenantDomain, id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase return retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const updatePurchaseReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { tenantDomain } = req.body;
    const result = await purchaseReturnServices.updatePurchaseReturn(tenantDomain, id, req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase return updated successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const deletePurchaseReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const result = await purchaseReturnServices.deletePurchaseReturn(tenantDomain, id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase return deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const approvePurchaseReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { tenantDomain } = req.body;
    const { Model: PurchaseReturn } = await getTenantModel(tenantDomain, 'PurchaseReturn');
    
    const purchaseReturn = await PurchaseReturn.findByIdAndUpdate(
      id,
      { 
        status: 'completed',
        // approvedBy: req.user._id,
        approvedDate: new Date()
      },
      { new: true }
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase return approved successfully',
      data: purchaseReturn,
    });
  } catch (err) {
    next(err);
  }
};

export const purchaseReturnControllers = {
  createPurchaseReturn,
  getAllPurchaseReturns,
  getSinglePurchaseReturn,
  updatePurchaseReturn,
  deletePurchaseReturn,
  approvePurchaseReturn,
};