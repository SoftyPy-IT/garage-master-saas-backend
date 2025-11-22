import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { reportServices } from './report.service';

const getMonthlyIncomeReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const result = await reportServices.getMonthlyIncomeReport(tenantDomain);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Monthly income report retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getYearlyIncomeReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const result = await reportServices.getYearlyIncomeReport(tenantDomain);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Yearly income report retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getTotalIncomeReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const result = await reportServices.getTotalIncomeReport(tenantDomain);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Total income report retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const reportControllers = {
  getMonthlyIncomeReport,
  getYearlyIncomeReport,
  getTotalIncomeReport,
};
