/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import sanitizePayload from '../../middlewares/updateDataValidation';
import {
  companyFields,
  customerFields,
  invoiceSearchableFields,
  showRoomFields,
  vehicleFields,
} from './invoice.const';
import { TInvoice } from './invoice.interface';
import { Invoice, invoiceSchema } from './invoice.model';
import { TCustomer } from '../customer/customer.interface';
import { TCompany } from '../company/company.interface';
import { TShowRoom } from '../showRoom/showRoom.interface';
import { TVehicle } from '../vehicle/vehicle.interface';
import { Customer, customerSchema } from '../customer/customer.model';
import { Company, companySchema } from '../company/company.model';
import { ShowRoom, showRoomSchema } from '../showRoom/showRoom.model';
import { Model } from 'mongoose';
import { generateInvoiceNo } from './invoice.utils';
import puppeteer from 'puppeteer';
import { join } from 'path';
import ejs from 'ejs';
import { amountInWords } from '../../middlewares/taka-in-words';
import { formatToIndianCurrency } from '../quotation/quotation.utils';
import { getTenantModel } from '../../utils/getTenantModels';

const createInvoiceDetails = async (
  tenantDomain: string,
  payload: {
    customer: TCustomer;
    company: TCompany;
    showroom: TShowRoom;
    vehicle: TVehicle;
    invoice: TInvoice;
  },
) => {
  const { Model: Invoice, connection } = await getTenantModel(
    tenantDomain,
    'Invoice',
  );
  const Quotation = (await getTenantModel(tenantDomain, 'Quotation')).Model;
  const Customer = (await getTenantModel(tenantDomain, 'Customer')).Model;
  const Company = (await getTenantModel(tenantDomain, 'Company')).Model;
  const ShowRoom = (await getTenantModel(tenantDomain, 'ShowRoom')).Model;
  const Vehicle = (await getTenantModel(tenantDomain, 'Vehicle')).Model;

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const { customer, company, showroom, invoice, vehicle } = payload;

    const sanitizeCustomer = sanitizePayload(customer);
    const sanitizeCompany = sanitizePayload(company);
    const sanitizeShowroom = sanitizePayload(showroom);
    const sanitizeVehicle = sanitizePayload(vehicle);
    const sanitizeInvoice = sanitizePayload(invoice);

    const invoiceNumber = await generateInvoiceNo(tenantDomain);

    const partsInWords = amountInWords(sanitizeInvoice.parts_total as number);
    const serviceInWords = amountInWords(
      sanitizeInvoice.service_total as number,
    );
    const netTotalInWords = amountInWords(sanitizeInvoice.net_total as number);

    const findInvoice = await Invoice.findOne({
      invoice_no: invoice.invoice_no,
    }).session(session);

    if (findInvoice) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Invoice already created by ${invoice.invoice_no}.`,
      );
    }

    const invoiceData = new Invoice({
      ...sanitizeInvoice,
      invoice_no: invoiceNumber,
      parts_total_In_words: partsInWords,
      service_total_in_words: serviceInWords,
      net_total_in_words: netTotalInWords,
    });

    await invoiceData.save({ session });

    const findQuotation = await Quotation.findOne({
      job_no: invoice.job_no,
    }).session(session);

    if (!findQuotation) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No quotation found.');
    }

    await Quotation.findByIdAndUpdate(
      findQuotation._id,
      { $set: { isCompleted: true, status: 'completed' } },
      { new: true, runValidators: true, session },
    );

    if (invoice.user_type === 'customer') {
      const existingCustomer = await Customer.findOne({
        customerId: invoice.Id,
      }).session(session);

      if (existingCustomer) {
        await Customer.findByIdAndUpdate(
          existingCustomer._id,
          { $set: sanitizeCustomer, $push: { invoices: invoiceData._id } },
          { new: true, runValidators: true, session },
        );
        invoiceData.customer = existingCustomer._id;
        await invoiceData.save({ session });
      }
    } else if (invoice.user_type === 'company') {
      const existingCompany = await Company.findOne({
        companyId: invoice.Id,
      }).session(session);

      if (existingCompany) {
        await Company.findByIdAndUpdate(
          existingCompany._id,
          { $set: sanitizeCompany, $push: { invoices: invoiceData._id } },
          { new: true, runValidators: true, session },
        );
        invoiceData.company = existingCompany._id;
        await invoiceData.save({ session });
      }
    } else if (invoice.user_type === 'showRoom') {
      const existingShowRoom = await ShowRoom.findOne({
        showRoomId: invoice.Id,
      }).session(session);

      if (existingShowRoom) {
        await ShowRoom.findByIdAndUpdate(
          existingShowRoom._id,
          { $set: sanitizeShowroom, $push: { invoices: invoiceData._id } },
          { new: true, runValidators: true, session },
        );
        invoiceData.showRoom = existingShowRoom._id;
        await invoiceData.save({ session });
      }
    }

    if (vehicle && vehicle.chassis_no) {
      const vehicleData = await Vehicle.findOneAndUpdate(
        { chassis_no: vehicle.chassis_no },
        { $set: sanitizeVehicle },
        { new: true, runValidators: true, session },
      );

      if (vehicleData) {
        invoiceData.vehicle = vehicleData._id;
        await invoiceData.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();
    return invoiceData;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getAllInvoicesFromDB = async (
  tenantDomain: string,
  id: string | null,
  limit: number,
  page: number,
  searchTerm: string,
  isRecycled?: string,
) => {
  const Invoice = (await getTenantModel(tenantDomain, 'Invoice')).Model;

  let idMatchQuery: Record<string, unknown> = {};
  let searchQuery: { [key: string]: any } = {};

  if (id) {
    idMatchQuery = {
      $or: [
        { 'customer._id': new mongoose.Types.ObjectId(id) },
        { 'company._id': new mongoose.Types.ObjectId(id) },
        { 'vehicle._id': new mongoose.Types.ObjectId(id) },
        { 'showRoom._id': new mongoose.Types.ObjectId(id) },
      ],
    };
  }

  if (searchTerm) {
    const escapedFilteringData = searchTerm.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );

    const quotationSearchQuery = invoiceSearchableFields.map((field) => ({
      [field]: { $regex: escapedFilteringData, $options: 'i' },
    }));

    const vehicleSearchQuery = vehicleFields.map((field) => {
      if (field === 'vehicle.vehicle_model' && !isNaN(Number(searchTerm))) {
        return { [field]: { $eq: Number(searchTerm) } };
      }
      return { [field]: { $regex: escapedFilteringData, $options: 'i' } };
    });

    const customerSearchQuery = customerFields.map((field) => ({
      [field]: { $regex: escapedFilteringData, $options: 'i' },
    }));

    const companySearchQuery = companyFields.map((field) => ({
      [field]: { $regex: escapedFilteringData, $options: 'i' },
    }));

    const showRoomSearchQuery = showRoomFields.map((field) => ({
      [field]: { $regex: escapedFilteringData, $options: 'i' },
    }));

    searchQuery = {
      $or: [
        ...quotationSearchQuery,
        ...vehicleSearchQuery,
        ...customerSearchQuery,
        ...companySearchQuery,
        ...showRoomSearchQuery,
      ],
    };
  }

  if (isRecycled !== undefined) {
    searchQuery.isRecycled = isRecycled === 'true';
  }

  const basePipeline = [
    {
      $lookup: {
        from: 'vehicles',
        localField: 'vehicle',
        foreignField: '_id',
        as: 'vehicle',
      },
    },
    { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'customers',
        localField: 'customer',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'showrooms',
        localField: 'showRoom',
        foreignField: '_id',
        as: 'showRoom',
      },
    },
    { $unwind: { path: '$showRoom', preserveNullAndEmptyArrays: true } },
    { $match: id ? idMatchQuery : {} },
    { $match: searchQuery },
  ];

  const dataPipeline = [
    ...basePipeline,
    {
      $lookup: {
        from: 'moneyreceipts',
        let: { job_no: '$job_no' },
        pipeline: [
          { $match: { $expr: { $eq: ['$job_no', '$$job_no'] } } },
          { $project: { _id: 0, remaining: 1, advance: 1, total_amount: 1 } },
        ],
        as: 'moneyReceipts',
      },
    },
    { $sort: { createdAt: -1 as 1 | -1 } },
    ...(page && limit
      ? [{ $skip: (page - 1) * limit }, { $limit: limit }]
      : []),
    {
      $addFields: {
        createdAtFormatted: {
          $cond: {
            if: { $not: ['$createdAt'] },
            then: 'N/A',
            else: {
              $dateToString: {
                format: '%Y-%m-%d %H:%M:%S',
                date: '$createdAt',
              },
            },
          },
        },
      },
    },
  ];

  const countPipeline = [...basePipeline, { $count: 'totalCount' }];

  const [invoices, totalDataAggregation] = await Promise.all([
    Invoice.aggregate(dataPipeline),
    Invoice.aggregate(countPipeline),
  ]);

  const totalData =
    totalDataAggregation.length > 0 ? totalDataAggregation[0].totalCount : 0;
  const totalPages = Math.ceil(totalData / limit);

  return { invoices, meta: { totalData, totalPages, currentPage: page } };
};

const updateInvoiceIntoDB = async (
  tenantDomain: string,
  id: string,
  payload: {
    customer: TCustomer;
    company: TCompany;
    showroom: TShowRoom;
    vehicle: TVehicle;
    invoice: TInvoice;
  },
) => {
  const { Model: Invoice, connection } = await getTenantModel(
    tenantDomain,
    'Invoice',
  );
  const Customer = (await getTenantModel(tenantDomain, 'Customer')).Model;
  const Company = (await getTenantModel(tenantDomain, 'Company')).Model;
  const ShowRoom = (await getTenantModel(tenantDomain, 'ShowRoom')).Model;
  const Vehicle = (await getTenantModel(tenantDomain, 'Vehicle')).Model;

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const { customer, company, showroom, invoice, vehicle } = payload;

    const sanitizeCustomer = sanitizePayload(customer);
    const sanitizeCompany = sanitizePayload(company);
    const sanitizeShowroom = sanitizePayload(showroom);
    const sanitizeVehicle = sanitizePayload(vehicle);
    const sanitizeInvoice = sanitizePayload(invoice);

    const partsInWords = amountInWords(sanitizeInvoice.parts_total as number);
    const serviceInWords = amountInWords(
      sanitizeInvoice.service_total as number,
    );
    const netTotalInWords = amountInWords(sanitizeInvoice.net_total as number);

    const updateInvoice = await Invoice.findByIdAndUpdate(
      id,
      {
        $set: {
          ...sanitizeInvoice,
          parts_total_In_words: partsInWords,
          service_total_in_words: serviceInWords,
          net_total_in_words: netTotalInWords,
        },
      },
      { new: true, runValidators: true, session },
    );

    if (!updateInvoice) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No invoice found');
    }

    if (invoice.user_type === 'customer') {
      const existingCustomer = await Customer.findOne({
        customerId: invoice.Id,
      }).session(session);
      if (existingCustomer) {
        await Customer.findByIdAndUpdate(
          existingCustomer._id,
          { $set: sanitizeCustomer },
          { new: true, runValidators: true, session },
        );
      }
    } else if (invoice.user_type === 'company') {
      const existingCompany = await Company.findOne({
        companyId: invoice.Id,
      }).session(session);
      if (existingCompany) {
        await Company.findByIdAndUpdate(
          existingCompany._id,
          { $set: sanitizeCompany },
          { new: true, runValidators: true, session },
        );
      }
    } else if (invoice.user_type === 'showRoom') {
      const existingShowRoom = await ShowRoom.findOne({
        showRoomId: invoice.Id,
      }).session(session);
      if (existingShowRoom) {
        await ShowRoom.findByIdAndUpdate(
          existingShowRoom._id,
          { $set: sanitizeShowroom },
          { new: true, runValidators: true, session },
        );
      }
    }

    if (vehicle && vehicle.chassis_no) {
      await Vehicle.findOneAndUpdate(
        { chassis_no: vehicle.chassis_no },
        { $set: sanitizeVehicle },
        { new: true, runValidators: true, session },
      );
    }

    await session.commitTransaction();
    session.endSession();
    return updateInvoice;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
const removeInvoiceFromUpdate = async (
  tenantDomain: string,
  id: string,
  index: number,
  invoice_name: string,
) => {
  const { Model: Invoice } = await getTenantModel(tenantDomain, 'Invoice');

  const existingInvoice = await Invoice.findById(id);
  if (!existingInvoice) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No invoice exists.');
  }

  let updateInvoice;

  if (invoice_name === 'parts') {
    updateInvoice = await Invoice.findByIdAndUpdate(
      existingInvoice._id,
      { $pull: { input_data: { $eq: existingInvoice.input_data[index] } } },
      { new: true, runValidators: true },
    );
  }

  if (invoice_name === 'service') {
    updateInvoice = await Invoice.findByIdAndUpdate(
      existingInvoice._id,
      {
        $pull: {
          service_input_data: {
            $eq: existingInvoice.service_input_data[index],
          },
        },
      },
      { new: true, runValidators: true },
    );
  }

  if (!updateInvoice) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No invoice found');
  }

  return updateInvoice;
};

const getSingleInvoiceDetails = async (tenantDomain: string, id: string) => {
  const { Model: Invoice, connection } = await getTenantModel(
    tenantDomain,
    'Invoice',
  );
  const Customer = (await getTenantModel(tenantDomain, 'Customer')).Model;
  const Company = (await getTenantModel(tenantDomain, 'Company')).Model;
  const ShowRoom = (await getTenantModel(tenantDomain, 'ShowRoom')).Model;
  const Vehicle = (await getTenantModel(tenantDomain, 'Vehicle')).Model;

  const singleInvoice = await Invoice.findById(id)
    .populate({ path: 'customer', model: Customer })
    .populate({ path: 'company', model: Company })
    .populate({ path: 'showRoom', model: ShowRoom })
    .populate({ path: 'vehicle', model: Vehicle });

  if (!singleInvoice) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No invoice found');
  }

  const formattedInvoice = {
    ...singleInvoice.toObject(),
    net_total: singleInvoice.net_total?.toLocaleString('en-IN'),
    due: singleInvoice.due?.toLocaleString('en-IN'),
    service_total: singleInvoice.service_total?.toLocaleString('en-IN'),
    total_amount: singleInvoice.total_amount?.toLocaleString('en-IN'),
    parts_total: singleInvoice.parts_total?.toLocaleString('en-IN'),
  };

  return formattedInvoice;
};

const deleteInvoice = async (tenantDomain: string, id: string) => {
  const Invoice = (await getTenantModel(tenantDomain, 'Invoice')).Model;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingInvoice = await Invoice.findById(id).session(session);
    if (!existingInvoice) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Invoice not available.');
    }

    type UserType = 'customer' | 'company' | 'showRoom';
    const userTypeMap: Record<
      UserType,
      { model: Model<any>; queryKey: string }
    > = {
      customer: { model: Customer, queryKey: 'customerId' },
      company: { model: Company, queryKey: 'companyId' },
      showRoom: { model: ShowRoom, queryKey: 'showRoomId' },
    };

    const userTypeHandler = userTypeMap[existingInvoice.user_type as UserType];
    if (userTypeHandler) {
      const { model, queryKey } = userTypeHandler;
      const existingEntity = await model
        .findOne({ [queryKey]: existingInvoice.Id })
        .session(session);
      if (existingEntity) {
        await model.findByIdAndUpdate(
          existingEntity._id,
          { $pull: { invoices: id } },
          { new: true, runValidators: true, session },
        );
      }
    }

    const deletedInvoice = await Invoice.findByIdAndDelete(id).session(session);
    if (!deletedInvoice) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No invoice available');
    }

    await session.commitTransaction();
    session.endSession();
    return null;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const permanentlyDeleteInvoice = async (tenantDomain: string, id: string) => {
  // Get tenant-specific models and connection
  const { Model: Invoice, connection: tenantConnection } = await getTenantModel(
    tenantDomain,
    'Invoice',
  );
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');

  const session = await tenantConnection.startSession();
  session.startTransaction();

  try {
    const existingInvoice = await Invoice.findById(id).session(session);

    if (!existingInvoice) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Invoice not available.');
    }

    type UserType = 'customer' | 'company' | 'showRoom';
    type UserMap = {
      [key in UserType]: { model: mongoose.Model<any>; queryKey: string };
    };

    const userTypeMap: UserMap = {
      customer: { model: Customer, queryKey: 'customerId' },
      company: { model: Company, queryKey: 'companyId' },
      showRoom: { model: ShowRoom, queryKey: 'showRoomId' },
    };

    const userTypeHandler = userTypeMap[existingInvoice.user_type as UserType];
    if (userTypeHandler) {
      const { model, queryKey } = userTypeHandler;

      const existingEntity = await model
        .findOne({ [queryKey]: existingInvoice.Id })
        .session(session);

      if (existingEntity) {
        await model.findByIdAndUpdate(
          existingEntity._id,
          { $pull: { invoices: id } },
          { new: true, runValidators: true, session },
        );
      }
    }

    const deletedInvoice = await Invoice.findByIdAndDelete(id).session(session);
    if (!deletedInvoice) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No invoice available');
    }

    await session.commitTransaction();
    session.endSession();

    return deletedInvoice;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const moveToRecycledBinInvoice = async (tenantDomain: string, id: string) => {
  const { Model: Invoice, connection } = await getTenantModel(
    tenantDomain,
    'Invoice',
  );
  const session = await connection.startSession();
  session.startTransaction();

  try {
    const existingInvoice = await Invoice.findById(id).session(session);

    if (!existingInvoice) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Invoice not available.');
    }

    const recycledInvoice = await Invoice.findByIdAndUpdate(
      id,
      { isRecycled: true, recycledAt: new Date() },
      { new: true, runValidators: true, session },
    );

    if (!recycledInvoice) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No invoice available');
    }

    await session.commitTransaction();
    session.endSession();

    return recycledInvoice;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const restoreFromRecycledBinInvoice = async (
  tenantDomain: string,
  id: string,
) => {
  const { Model: Invoice, connection } = await getTenantModel(
    tenantDomain,
    'Invoice',
  );
  const session = await connection.startSession();
  session.startTransaction();

  try {
    const recycledInvoice = await Invoice.findById(id).session(session);

    if (!recycledInvoice) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Invoice not available.');
    }

    if (!recycledInvoice.isRecycled) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        'Invoice is not in the recycle bin.',
      );
    }

    const restoredInvoice = await Invoice.findByIdAndUpdate(
      id,
      { isRecycled: false, recycledAt: null },
      { new: true, runValidators: true, session },
    );

    if (!restoredInvoice) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No invoice available');
    }

    await session.commitTransaction();
    session.endSession();

    return restoredInvoice;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const moveAllToRecycledBin = async () => {
  const result = await Invoice.updateMany(
    {},
    { $set: { isRecycled: true, recycledAt: new Date() } },
    { runValidators: true },
  );

  return result;
};
const restoreAllFromRecycledBin = async () => {
  const result = await Invoice.updateMany(
    { isRecycled: true },
    { $set: { isRecycled: false }, $unset: { recycledAt: '' } },
    { runValidators: true },
  );

  return result;
};

const generateInvoicePDF = async (
  tenantDomain: string,
  id: string,
  imageUrl: string,
  companyData: string,
): Promise<Buffer> => {
  const { Model: Invoice } = await getTenantModel(tenantDomain, 'Invoice');
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');
  const companyProfile = JSON.parse(companyData || '{}');
  const invoice = await Invoice.findById(id)
    .populate({ path: 'customer', model: Customer })
    .populate({ path: 'company', model: Company })
    .populate({ path: 'showRoom', model: ShowRoom })
    .populate({ path: 'vehicle', model: Vehicle });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  let logoBase64 = '';
  try {
    const logoUrl = `${imageUrl}/images/logo.png`;
    const logoResponse = await fetch(logoUrl);
    const logoBuffer = await logoResponse.arrayBuffer();
    logoBase64 = Buffer.from(logoBuffer).toString('base64');
  } catch (error) {
    console.warn('Failed to load logo:', error);
  }

  const filePath = join(__dirname, '../../templates/invoice.ejs');

  const html = await new Promise<string>((resolve, reject) => {
    ejs.renderFile(
      filePath,
      {
        invoice,
        imageUrl,
        formatToIndianCurrency,
        logoBase64,
        companyData: companyProfile,
      },
      (err, str) => {
        if (err) return reject(err);
        resolve(str);
      },
    );
  });

  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });

    await browser.close();
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('PDF generation failed');
  }
};

export const InvoiceServices = {
  createInvoiceDetails,
  getAllInvoicesFromDB,
  getSingleInvoiceDetails,
  updateInvoiceIntoDB,
  deleteInvoice,
  removeInvoiceFromUpdate,
  generateInvoicePDF,
  moveToRecycledBinInvoice,
  restoreFromRecycledBinInvoice,
  permanentlyDeleteInvoice,
  moveAllToRecycledBin,
  restoreAllFromRecycledBin,
};
