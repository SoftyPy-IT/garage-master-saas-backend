import { NextFunction, Request, RequestHandler, Response } from 'express';
import { barcodeService } from './barcode.service';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';

const getAllBarcode = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await barcodeService.getAllBarcode(req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Barcode are retrieved succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getBarcodeById: RequestHandler = catchAsync(async (req, res) => {
  const result = await barcodeService.getBarcodeById(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Barcode retrieved successfully',
    data: result,
  });
});

const createBarcode: RequestHandler = catchAsync(async (req, res) => {
  const result = await barcodeService.createBarcode(req);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Barcode created successfully',
    data: result,
  });
});

const updateBarcode: RequestHandler = catchAsync(async (req, res) => {
  const result = await barcodeService.updateBarcode();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Barcode updated successfully',
    data: result,
  });
});

const deleteBarcode: RequestHandler = catchAsync(async (req, res) => {
  await barcodeService.deleteBarcode(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Barcode deleted successfully',
    data: null,
  });
});

export const barcodeController = {
  getAllBarcode,
  getBarcodeById,
  createBarcode,
  updateBarcode,
  deleteBarcode,
};
