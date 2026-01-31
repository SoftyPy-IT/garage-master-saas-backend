import { NextFunction, Request, Response } from 'express';

import httpStatus from 'http-status';

import sendResponse from '../../utils/sendResponse';
import { expenseServices } from './expense.service';

const createExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = req.body;
    const tenantDomain = req.query.tenantDomain as string;

    if (payload.data) {
      Object.assign(payload, JSON.parse(payload.data));
      delete payload.data;
    }

    const result = await expenseServices.createExpense(tenantDomain, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Expense created successfully',
      data: result,
    });
  } catch (err: any) {
    console.error('Error in controller:', err.message);
    next(err);
  }
};
const getAllExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;

    const result = await expenseServices.getAllExpense(tenantDomain, req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Expense are retrieved succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const getSingleExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;

    const result = await expenseServices.getSingleExpense(tenantDomain, id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Expense is retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const deleteExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;

    const { id } = req.params;
    const result = await expenseServices.deleteExpense(tenantDomain, id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Expense deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const updateExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = req.body;
    if (payload.data) {
      Object.assign(payload, JSON.parse(payload.data));
      delete payload.data;
    }

    const tenantDomain = req.query.tenantDomain as string;

    const { id } = req.params;
    const result = await expenseServices.updateExpense(
      tenantDomain,
      id,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Expense update succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const expenseControllers = {
  getAllExpense,
  getSingleExpense,
  deleteExpense,
  updateExpense,
  createExpense,
};
