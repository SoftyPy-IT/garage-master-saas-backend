/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { QuotationServices } from './quotation.service';
import { RequestHandler } from 'express';

const createQuotation = catchAsync(async (req, res) => {
  const { tenantDomain } = req.body;
  const result = await QuotationServices.createQuotationDetails(
    tenantDomain,
    req.body,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation created successful!',
    data: result,
  });
});

const getAllQuotations = catchAsync(async (req, res) => {
  const id = req.query.id as string;
  const limit = parseInt(req.query.limit as string);
  const page = parseInt(req.query.page as string);
  const isRecycled = req.query.isRecycled as string;
  const searchTerm = req.query.searchTerm as string;
  const status = req.query.status as string | undefined;
  const tenantDomain = req.query.tenantDomain as string;

  const result = await QuotationServices.getAllQuotationsFromDB(
    tenantDomain,
    id,
    limit,
    page,
    searchTerm,
    isRecycled,
    status,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotations are retrieved successful',
    data: result,
  });
});
const getAllQuotationsForDashboard = catchAsync(async (req, res) => {
  const tenantDomain = req.query.tenantDomain as string;

  const result = await QuotationServices.getAllQuotationsFromDBForDashboard();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotations are retrieved successful',
    data: result,
  });
});

const getSingleQuotation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;

  const result = await QuotationServices.getSingleQuotationDetails(
    tenantDomain,
    id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation retrieved successful!',
    data: result,
  });
});

const updateQuotation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { tenantDomain } = req.body;
  const quotation = await QuotationServices.updateQuotationIntoDB(
    tenantDomain,
    id,
    req.body,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation update successful!',
    data: quotation,
  });
});

const removeQuotationFromUpdate = catchAsync(async (req, res) => {
  const { id } = req.query;
  const tenantDomain = req.query.tenantDomain as string;

  const { index, quotation_name } = req.body;

  const invoice = await QuotationServices.removeQuotationFromUpdate(
    tenantDomain,
    id as string,
    index,
    quotation_name,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation removed successful!',
    data: invoice,
  });
});

const deleteQuotation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;

  const quotation = await QuotationServices.deleteQuotation(tenantDomain, id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation deleted successful!',
    data: quotation,
  });
});

const generateQuotationPdf: RequestHandler = catchAsync(async (req, res) => {
  const { quotationId } = req.params;
  const tenantDomain = req.query.tenantDomain as string;
  const companyData = req.query.companyProfileData
    ? decodeURIComponent(req.query.companyProfileData as string)
    : '{}';
  const baseUrl = (
    process.env.NEXT_PUBLIC_IMAGE_BASE_URL ||
    'https://api.trustautosolution.com'
  ).replace(/\/$/, '');

  try {
    const pdfBuffer = await QuotationServices.generateQuotationPdf(
      tenantDomain,
      quotationId,
      baseUrl,
      companyData,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=quotation-${quotationId}.pdf`,
    );

    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({
      status: 'error',
      message:
        error.message || 'An error occurred while generating the quotation.',
    });
  }
});

const permanantlyDeleteQuotation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;

  const quotation = await QuotationServices.permanentlyDeleteQuotation(
    tenantDomain,
    id,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation permanantly deleted successful!',
    data: quotation,
  });
});

const moveToRecyclebinQuotation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;

  const quotation = await QuotationServices.moveToRecyclebinQuotation(
    tenantDomain,
    id,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation move to Recyled bin successful!',
    data: quotation,
  });
});
const restoreFromRecyclebinQuotation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;

  const quotation = await QuotationServices.restoreFromRecyclebinQuotation(
    tenantDomain,
    id,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation  restore successful!',
    data: quotation,
  });
});

const moveAllToRecycledBinMoneyReceipts = catchAsync(async (req, res) => {
  const result = await QuotationServices.moveAllToRecycledBin();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `${result.modifiedCount} quotaton moved to the recycle bin successfully.`,
    data: null,
  });
});
const restoreAllFromRecycledBinMoneyReceipts = catchAsync(async (req, res) => {
  const result = await QuotationServices.restoreAllFromRecycledBin();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `${result.modifiedCount} quotaion restored successfully.`,
    data: null,
  });
});
export const quotationController = {
  createQuotation,
  getAllQuotations,
  getAllQuotationsForDashboard,
  getSingleQuotation,
  updateQuotation,
  deleteQuotation,
  removeQuotationFromUpdate,
  generateQuotationPdf,
  restoreFromRecyclebinQuotation,
  permanantlyDeleteQuotation,
  moveToRecyclebinQuotation,
  restoreAllFromRecycledBinMoneyReceipts,
  moveAllToRecycledBinMoneyReceipts,
};
