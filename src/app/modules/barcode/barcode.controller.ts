import { NextFunction, Request, RequestHandler, Response } from 'express';
import { barcodeService } from './barcode.service';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';

const getAllBarcode = catchAsync(async ( req, res, next) => {
  try {
        const tenantDomain = req.query.tenantDomain as string;
    const result = await barcodeService.getAllBarcode(req.query, tenantDomain);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Barcode are retrieved succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

const getBarcodeById: RequestHandler = catchAsync(async (req, res) => {
      const tenantDomain = req.query.tenantDomain as string;
  const result = await barcodeService.getBarcodeById( tenantDomain, req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Barcode retrieved successfully',
    data: result,
  });
});

const createBarcode: RequestHandler = catchAsync(async (req, res) => {
      const tenantDomain = req.query.tenantDomain as string;
  const result = await barcodeService.createBarcode(tenantDomain, req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Barcode created successfully',
    data: result,
  });
});

const updateBarcode: RequestHandler = catchAsync(async (req, res) => {
  const {id} = req.params 
       const tenantDomain = req.query.tenantDomain as string;
  const result = await barcodeService.updateBarcode(tenantDomain, id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Barcode updated successfully',
    data: result,
  });
});

const deleteBarcode: RequestHandler = catchAsync(async (req, res) => {
    const {id} = req.params 
        const tenantDomain = req.query.tenantDomain as string;
  await barcodeService.deleteBarcode(tenantDomain, id);

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
