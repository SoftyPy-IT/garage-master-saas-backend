// src/modules/stockTransaction/stockTransaction.controller.ts
import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { stockTransactionServices } from './stockTransaction.service';

const createStockTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const result = await stockTransactionServices.createStockTransaction(tenantDomain, req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Stock transaction created successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getAllStockTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const result = await stockTransactionServices.getAllStockTransactions(tenantDomain);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All stock transactions retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getSingleStockTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const { id } = req.params;
    const result = await stockTransactionServices.getSingleStockTransaction(tenantDomain, id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Single stock transaction retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const stockTransactionControllers = {
  createStockTransaction,
  getAllStockTransactions,
  getSingleStockTransaction,
};