import { Request, Response, NextFunction } from 'express';
import sendResponse from '../../utils/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { getFinancialReportOrdered } from './report.service';

const getReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantDomain = req.query.tenantDomain as string;
    const yearsQuery = req.query.years as string;

    let years: number[] = [];
    if (yearsQuery) {
      years = yearsQuery.split(',').map((y) => parseInt(y));
    } else {
      years = [new Date().getFullYear()];
    }

    const reports = [];
    for (let y of years) {
      const report = await getFinancialReportOrdered(tenantDomain, y);
      reports.push(report);
    }

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Invoice → Income → Expense monthly & yearly report generated',
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

export const ReportController = { getReport };
