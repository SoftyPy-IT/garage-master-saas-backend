import { RequestHandler } from 'express';

import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';
import { expenseCategoryService } from './expense.category.service';

const getAllExpenseCategories: RequestHandler = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;

  const result = await expenseCategoryService.getAllExpenseCategories(
    tenantDomain,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Expense categories retrieved successfully',
    data: result.result,
  });
});

const getExpenseCategoryById: RequestHandler = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;

  const result = await expenseCategoryService.getExpenseCategoryById(
    tenantDomain,
    req.params.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Expense category retrieved successfully',
    data: result,
  });
});



const createExpenseCategory: RequestHandler = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;

  const result = await expenseCategoryService.createExpenseCategory(
    tenantDomain,
    req,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Expense category created successfully',
    data: result,
  });
});

const updateExpenseCategory: RequestHandler = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;

  const result = await expenseCategoryService.updateExpenseCategory(
    tenantDomain,
    req.params.id,
    req,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Expense category updated successfully',
    data: result,
  });
});

const deleteExpenseCategory: RequestHandler = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;

  await expenseCategoryService.deleteExpenseCategory(
    tenantDomain,
    req.params.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Expense category deleted successfully',
    data: null,
  });
});

export const expenseCategoryController = {
  getAllExpenseCategories,
  getExpenseCategoryById,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
};
