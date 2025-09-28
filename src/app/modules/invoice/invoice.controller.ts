/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { InvoiceServices } from './invoice.service';
import { RequestHandler } from 'express';

const createInvoice = catchAsync(async (req, res) => {
  const { tenantDomain } = req.body;
  const result = await InvoiceServices.createInvoiceDetails(tenantDomain, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Invoice created successful!',
    data: result,
  });
});
const getAllInvoices = catchAsync(async (req, res) => {
  const id = req.query.id as string;
  const limit = parseInt(req.query.limit as string);
  const page = parseInt(req.query.page as string);
  const searchTerm = req.query.searchTerm as string;
  const isRecycled = req.query.isRecycled as string;
   const tenantDomain = req.query.tenantDomain as string;

  const result = await InvoiceServices.getAllInvoicesFromDB(
    tenantDomain,
    id,
    limit,
    page,
    searchTerm,
    isRecycled,
  );

  const formattedInvoices = result.invoices.map((invoice) => ({
    ...invoice,
    moneyReceipts: invoice.moneyReceipts || [], 
    net_total: invoice.net_total
      ? invoice.net_total.toLocaleString('en-IN')
      : '0',
    due: invoice.due ? invoice.due.toLocaleString('en-IN') : '0',
    service_total: invoice.service_total
      ? invoice.service_total.toLocaleString('en-IN')
      : '0',
    total_amount: invoice.total_amount
      ? invoice.total_amount.toLocaleString('en-IN')
      : '0',
    parts_total: invoice.parts_total
      ? invoice.parts_total.toLocaleString('en-IN')
      : '0',
  }));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Invoices retrieved successfully',
    data: {
      invoices: formattedInvoices,
      meta: result.meta,
    },
  });
});

const getSingleInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;

  const result = await InvoiceServices.getSingleInvoiceDetails(tenantDomain ,id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Invoice retrieved successful!',
    data: result,
  });
});

const updateInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { tenantDomain } = req.body;
  const invoice = await InvoiceServices.updateInvoiceIntoDB(tenantDomain,id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Invoice update successful!',
    data: invoice,
  });
});
const removeInvoiceFromUpdate = catchAsync(async (req, res) => {
  const { id } = req.query;
  const tenantDomain = req.query.tenantDomain as string;

  const { index, invoice_name } = req.body;

  const invoice = await InvoiceServices.removeInvoiceFromUpdate(
    tenantDomain,
    id as string,
    index,
    invoice_name,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Invoice removed successful!',
    data: invoice,
  });
});

const deleteInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;

  const invoice = await InvoiceServices.deleteInvoice(tenantDomain,id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Invoice deleted successful!',
    data: invoice,
  });
});
const permanantlyDeleteInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;

  const invoice = await InvoiceServices.permanantlyDeleteInvoice(tenantDomain,id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Invoice permanently deleted successful!',
    data: invoice,
  });
});
const moveToRecylebinInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;

  const invoice = await InvoiceServices.moveToRecycledbinInvoice(tenantDomain,id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Invoice move to recycled bin successful!',
    data: invoice,
  });
});
const restoreFromRecylebinInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantDomain = req.query.tenantDomain as string;

  const invoice = await InvoiceServices.restoreFromRecycledbinInvoice(tenantDomain,id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Invoice restore successful!',
    data: invoice,
  });
});
const moveAllToRecycledBinMoneyReceipts = catchAsync(async (req, res) => {
  const result = await InvoiceServices.moveAllToRecycledBin();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `${result.modifiedCount} invoice moved to the recycle bin successfully.`,
    data: null,
  });
});
const restoreAllFromRecycledBinMoneyReceipts = catchAsync(async (req, res) => {
  const result = await InvoiceServices.restoreAllFromRecycledBin();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `${result.modifiedCount} invoice restored successfully.`,
    data: null,
  });
});


const generateQuotationPdf: RequestHandler = catchAsync(async (req, res) => {
  const { invoiceId } = req.params;
   const tenantDomain = req.query.tenantDomain as string;
     const companyData = req.query.companyProfileData
    ? decodeURIComponent(req.query.companyProfileData as string)
    : '{}';
  const baseUrl = (
    process.env.NEXT_PUBLIC_IMAGE_BASE_URL || 'https://api.trustautosolution.com'
  ).replace(/\/$/, '');

  try {
    const pdfBuffer = await InvoiceServices.generateInvoicePDF(
      tenantDomain,
      invoiceId,
      baseUrl,
      companyData
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${invoiceId}.pdf`,
    );

    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({
      status: 'error',
      message:
        error.message || 'An error occurred while generating the invoice.',
    });
  }
});
export const invoiceController = {
  createInvoice,
  getAllInvoices,
  getSingleInvoice,
  updateInvoice,
  deleteInvoice,
  removeInvoiceFromUpdate,
  generateQuotationPdf,
  restoreFromRecylebinInvoice,
  moveToRecylebinInvoice,
  permanantlyDeleteInvoice,
  restoreAllFromRecycledBinMoneyReceipts,
  moveAllToRecycledBinMoneyReceipts,
};
