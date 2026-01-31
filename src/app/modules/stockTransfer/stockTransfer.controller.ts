import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { stockTransferServices } from './stockTransfer.services';

const createStockTransfer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;

    // Check if items is an array
    if (!Array.isArray(req.body.items)) {
      console.error('Items is not an array:', req.body.items);
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: 'Items must be an array',
        data: null,
      });
    }

    const result = await stockTransferServices.createStockTransfer(
      tenantDomain,
      req.body,
    );

    if (result.success) {
      sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: result.message || 'Stock transfer created successfully',
        data: result.data,
      });
    } else {
      sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: result.message || 'Failed to create stock transfer',
        data: null,
      });
    }
  } catch (err) {
    console.error('Error in createStockTransfer controller:', err);
    next(err);
  }
};
const getAllStockTransfers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const result =
      await stockTransferServices.getAllStockTransfers(tenantDomain);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfer history retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const deleteStockTransfer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const result = await stockTransferServices.deleteStockTransfer(
      tenantDomain,
      id,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfer deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const updateStockTransfer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const updateData = req.body;

    const result = await stockTransferServices.updateStockTransfer(
      tenantDomain,
      id,
      updateData,
    );

    if (result.success) {
      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message || 'Stock transfer updated successfully',
        data: result.data,
      });
    } else {
      sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: result.message || 'Failed to update stock transfer',
        data: null,
      });
    }
  } catch (err) {
    console.error('Error in update stock transfer controller:', err);
    next(err);
  }
};

export const stockTransferControllers = {
  createStockTransfer,
  getAllStockTransfers,
  deleteStockTransfer,
  updateStockTransfer
};
