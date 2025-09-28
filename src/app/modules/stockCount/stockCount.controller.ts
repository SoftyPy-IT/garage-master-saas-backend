import { NextFunction, Request, RequestHandler, Response } from 'express';
import { StockCountService } from './stockCount.service';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';

const getAllStockCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await StockCountService.getAllStockCount(req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock Count retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getStockCountById: RequestHandler = catchAsync(async (req, res) => {
  const result = await StockCountService.getStockCountById(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Stock Count retrieved successfully',
    data: result,
  });
});

const createStockCount: RequestHandler = catchAsync(async (req, res) => {
  const result = await StockCountService.createStockCount(req);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Stock Count created successfully',
    data: result,
  });
});

const updateStockCount: RequestHandler = catchAsync(async (req, res) => {
  const result = await StockCountService.updateStockCount(req.params.id, req);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Stock Count updated successfully',
    data: result,
  });
});

const deleteStockCount: RequestHandler = catchAsync(async (req, res) => {
  await StockCountService.deleteStockCount(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Stock Count deleted successfully',
    data: null,
  });
});

export const StockCountController = {
  getAllStockCount,
  getStockCountById,
  createStockCount,
  updateStockCount,
  deleteStockCount,
};
