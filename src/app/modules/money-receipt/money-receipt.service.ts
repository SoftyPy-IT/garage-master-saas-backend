/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import sanitizePayload from '../../middlewares/updateDataValidation';
import { TMoneyReceipt } from './money-receipt.interface';
import { MoneyReceipt, moneyReceiptSchema } from './money-receipt.model';
import mongoose from 'mongoose';
import { vehicleSchema } from '../vehicle/vehicle.model';
import { SearchableFields } from './money-receipt.const';
import { generateMoneyReceiptId } from './money-receipt.utils';
import { amountInWords } from '../../middlewares/taka-in-words';
import puppeteer from 'puppeteer';
import { join } from 'path';
import ejs from 'ejs';
import { formatToIndianCurrency } from '../quotation/quotation.utils';
import { getTenantModel } from '../../utils/getTenantModels';
import { Tenant } from '../tenant/tenant.model';
import { connectToTenantDatabase } from '../../../server';
import { invoiceSchema } from '../invoice/invoice.model';


const createMoneyReceiptDetails = async (
  tenantDomain: string,
  payload: TMoneyReceipt,
) => {
  const { Model: MoneyReceipt, connection } = await getTenantModel(
    tenantDomain,
    'MoneyReceipt',
  );
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');
  const { Model: Invoice } = await getTenantModel(tenantDomain, 'Invoice');

  // Start session from the tenant-specific connection
  const session = await connection.startSession();
  session.startTransaction();

  try {
    const {
      user_type,
      Id,
      chassis_no,
      full_reg_number,
      invoice: invoiceNo,
      job_no,
    } = payload;

    const sanitizeData = sanitizePayload(payload);
    const moneyReceiptId = await generateMoneyReceiptId(tenantDomain);

    const totalAmountInWords = amountInWords(
      sanitizeData.total_amount as number,
    );
    const advanceInWords =
      sanitizeData.advance !== undefined
        ? amountInWords(sanitizeData.advance)
        : 'Zero';
    const remainingInWords =
      sanitizeData.remaining !== undefined
        ? amountInWords(sanitizeData.remaining)
        : '';

    const paymentStatus =
      sanitizeData.against_bill_no_method === 'Final payment against bill no'
        ? 'final'
        : 'advance';

    const moneyReceiptData = new MoneyReceipt({
      ...sanitizeData,
      moneyReceiptId,
      total_amount_in_words: totalAmountInWords,
      advance_in_words: advanceInWords,
      remaining_in_words: remainingInWords,
      payment_status: paymentStatus,
    });

    // Associate user type
    if (user_type === 'customer') {
      const existingCustomer = await Customer.findOne({
        customerId: Id,
      }).session(session);
      if (existingCustomer) {
        await Customer.findByIdAndUpdate(
          existingCustomer._id,
          { $push: { money_receipts: moneyReceiptData._id } },
          { new: true, session },
        );
        moneyReceiptData.customer = existingCustomer._id;
      }
    } else if (user_type === 'company') {
      const existingCompany = await Company.findOne({ companyId: Id }).session(
        session,
      );
      if (existingCompany) {
        await Company.findByIdAndUpdate(
          existingCompany._id,
          { $push: { money_receipts: moneyReceiptData._id } },
          { new: true, session },
        );
        moneyReceiptData.company = existingCompany._id;
      }
    } else if (user_type === 'showRoom') {
      const existingShowRoom = await ShowRoom.findOne({
        showRoomId: Id,
      }).session(session);
      if (existingShowRoom) {
        await ShowRoom.findByIdAndUpdate(
          existingShowRoom._id,
          { $push: { money_receipts: moneyReceiptData._id } },
          { new: true, session },
        );
        moneyReceiptData.showRoom = existingShowRoom._id;
      }
    }

    // Associate vehicle
    if (chassis_no) {
      const vehicleData = await Vehicle.findOne({ chassis_no }).session(
        session,
      );
      if (vehicleData) {
        moneyReceiptData.vehicle = vehicleData._id;
        moneyReceiptData.full_reg_number = full_reg_number;
      }
    }

    // Link to invoice
    const existingInvoice = await Invoice.findOne({
      $or: [{ invoice_no: invoiceNo }, { job_no }],
    }).session(session);

    if (existingInvoice) {
      const totalAmount = Number(existingInvoice.net_total) || 0;
      const prevAdvance = Number(existingInvoice.advance) || 0;

      const currentPayment =
        sanitizeData.against_bill_no_method === 'Advance against bill no'
          ? Number(sanitizeData.advance)
          : moneyReceiptData.payment_status === 'final'
            ? Number(existingInvoice.due + existingInvoice.advance)
            : Number(sanitizeData.total_amount);

      const updatedAdvance =
        sanitizeData.against_bill_no_method === 'Advance against bill no'
          ? prevAdvance + currentPayment
          : currentPayment;

      const updatedDue = Math.max(totalAmount - updatedAdvance, 0);

      await Invoice.findByIdAndUpdate(
        existingInvoice._id,
        {
          $push: { moneyReceipts: moneyReceiptData._id },
          $set: { advance: updatedAdvance, due: updatedDue },
        },
        { new: true, session },
      );

      moneyReceiptData.invoice = existingInvoice._id;
      moneyReceiptData.job_no = existingInvoice.job_no;
    }

    // Save the final money receipt
    await moneyReceiptData.save({ session });

    await session.commitTransaction();
    session.endSession();
    return moneyReceiptData;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const updateMoneyReceiptDetails = async (
  tenantDomain: string,
  id: string,
  payload: TMoneyReceipt,
) => {
  const { connection, Model: MoneyReceipt } = await getTenantModel(
    tenantDomain,
    'MoneyReceipt',
  );

  const session = await connection.startSession();
  session.startTransaction();

  try {

    const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
    const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
    const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
    const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');
    const { Model: Invoice } = await getTenantModel(tenantDomain, 'Invoice');

    const { user_type, Id, chassis_no, full_reg_number, invoice: invoiceNo, job_no } = payload;
    const sanitizeData = sanitizePayload(payload);
    const totalAmountInWords = amountInWords(sanitizeData.total_amount as number);
    const advanceInWords =
      sanitizeData.advance !== undefined
        ? amountInWords(sanitizeData.advance)
        : 'Zero';
    const remainingInWords =
      sanitizeData.remaining !== undefined
        ? amountInWords(sanitizeData.remaining)
        : '';
    const paymentStatus =
      sanitizeData.against_bill_no_method === 'Final payment against bill no'
        ? 'final'
        : 'advance';

    const moneyReceiptData = await MoneyReceipt.findByIdAndUpdate(
      id,
      {
        $set: {
          ...sanitizeData,
          total_amount_in_words: totalAmountInWords,
          advance_in_words: advanceInWords,
          remaining_in_words: remainingInWords,
          payment_status: paymentStatus,
        },
      },
      { new: true, runValidators: true, session },
    );

    if (!moneyReceiptData) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Money receipt not found.');
    }

    if (user_type === 'customer') {
      const existingCustomer = await Customer.findOne({ customerId: Id }).session(session);
      if (
        existingCustomer &&
        !existingCustomer.money_receipts.includes(moneyReceiptData._id)
      ) {
        await Customer.findByIdAndUpdate(
          existingCustomer._id,
          { $push: { money_receipts: moneyReceiptData._id } },
          { new: true, runValidators: true, session },
        );
        moneyReceiptData.customer = existingCustomer._id;
      }
    } else if (user_type === 'company') {
      const existingCompany = await Company.findOne({ companyId: Id }).session(session);
      if (
        existingCompany &&
        !existingCompany.money_receipts.includes(moneyReceiptData._id)
      ) {
        await Company.findByIdAndUpdate(
          existingCompany._id,
          { $push: { money_receipts: moneyReceiptData._id } },
          { new: true, runValidators: true, session },
        );
        moneyReceiptData.company = existingCompany._id;
      }
    } else if (user_type === 'showRoom') {
      const existingShowRoom = await ShowRoom.findOne({ showRoomId: Id }).session(session);
      if (
        existingShowRoom &&
        !existingShowRoom.money_receipts.includes(moneyReceiptData._id)
      ) {
        await ShowRoom.findByIdAndUpdate(
          existingShowRoom._id,
          { $push: { money_receipts: moneyReceiptData._id } },
          { new: true, runValidators: true, session },
        );
        moneyReceiptData.showRoom = existingShowRoom._id;
      }
    }

    // Re-link vehicle if needed
    if (chassis_no) {
      const vehicleData = await Vehicle.findOne({ chassis_no }).session(session);
      if (vehicleData) {
        moneyReceiptData.vehicle = vehicleData._id;
        moneyReceiptData.full_reg_number = full_reg_number;
      }
    }

    // Recalculate invoice relationship (core logic)
    const existingInvoice = await Invoice.findOne({
      $or: [{ invoice_no: invoiceNo }, { job_no }],
    }).session(session);

    if (existingInvoice) {
      const totalAmount = Number(existingInvoice.net_total) || 0;
      const prevAdvance = Number(existingInvoice.advance) || 0;

      // Determine new payment
      const currentPayment =
        sanitizeData.against_bill_no_method === 'Advance against bill no'
          ? Number(sanitizeData.advance)
          : paymentStatus === 'final'
            ? Number(existingInvoice.due + existingInvoice.advance)
            : Number(sanitizeData.total_amount);

      const updatedAdvance =
        sanitizeData.against_bill_no_method === 'Advance against bill no'
          ? prevAdvance + currentPayment
          : currentPayment;

      const updatedDue = Math.max(totalAmount - updatedAdvance, 0);

      await Invoice.findByIdAndUpdate(
        existingInvoice._id,
        {
          $set: { advance: updatedAdvance, due: updatedDue },
        },
        { new: true, runValidators: true, session },
      );

      moneyReceiptData.invoice = existingInvoice._id;
      moneyReceiptData.job_no = existingInvoice.job_no;
    }
    await moneyReceiptData.save({ session });

    await session.commitTransaction();
    session.endSession();

    return moneyReceiptData;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};



const getAllMoneyReceiptsFromDB = async (
  tenantDomain: string,
  id: string | null,
  limit: number,
  page: number,
  searchTerm: string,
  isRecycled?: string,
) => {
  const { Model: MoneyReceipt } = await getTenantModel(
    tenantDomain,
    'MoneyReceipt',
  );
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');

  let idMatchQuery: any = {};
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

    const moneyReceiptSearchQuery = SearchableFields.map((field) => ({
      [field]: { $regex: escapedFilteringData, $options: 'i' },
    }));

    const amountCondition = !isNaN(Number(searchTerm))
      ? [{ total_amount: Number(searchTerm) }]
      : [];
    const payableAmountCondition = !isNaN(Number(searchTerm))
      ? [{ remaining: Number(searchTerm) }]
      : [];

    searchQuery = {
      $or: [
        ...moneyReceiptSearchQuery,
        ...amountCondition,
        ...payableAmountCondition,
      ],
    };
  }

  if (isRecycled !== undefined) {
    searchQuery.isRecycled = isRecycled === 'true';
  }

  const moneyReceipts = await MoneyReceipt.aggregate([
    {
      $lookup: {
        from: Vehicle.collection.name,
        localField: 'vehicle',
        foreignField: '_id',
        as: 'vehicle',
      },
    },
    { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: Company.collection.name,
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: Customer.collection.name,
        localField: 'customer',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: ShowRoom.collection.name,
        localField: 'showRoom',
        foreignField: '_id',
        as: 'showRoom',
      },
    },
    { $unwind: { path: '$showRoom', preserveNullAndEmptyArrays: true } },
    { $match: id ? idMatchQuery : {} },
    { $match: searchQuery },
    { $sort: { createdAt: -1 } },
    ...(page && limit
      ? [{ $skip: (page - 1) * limit }, { $limit: limit }]
      : []),
  ]);

  const jobMap: {
    [job_no: string]: {
      receipts: any[];
      totalAmount: number;
      remaining: number;
    };
  } = {};

  for (const receipt of moneyReceipts) {
    const jobNo = receipt.job_no;
    if (!jobNo) continue;

    if (!jobMap[jobNo]) {
      jobMap[jobNo] = { receipts: [], totalAmount: 0, remaining: 0 };
    }

    jobMap[jobNo].receipts.push(receipt);
    jobMap[jobNo].totalAmount += receipt.total_amount || 0;

    if (jobMap[jobNo].receipts.length === 1) {
      jobMap[jobNo].remaining = receipt.remaining || 0;
    }
  }

  for (const jobNo in jobMap) {
    const { receipts, remaining, totalAmount } = jobMap[jobNo];

    let color = '#2dce89';
    if (remaining > 0 && remaining < totalAmount) {
      color = '#ffad46';
    } else if (remaining >= totalAmount) {
      color = '#f5365c';
    }

    receipts.forEach((r) => {
      r.paymentColor = color;
    });
  }

  const totalDataAggregation = await MoneyReceipt.aggregate([
    {
      $lookup: {
        from: Vehicle.collection.name,
        localField: 'vehicle',
        foreignField: '_id',
        as: 'vehicle',
      },
    },
    { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: Company.collection.name,
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: Customer.collection.name,
        localField: 'customer',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: ShowRoom.collection.name,
        localField: 'showRoom',
        foreignField: '_id',
        as: 'showRoom',
      },
    },
    { $unwind: { path: '$showRoom', preserveNullAndEmptyArrays: true } },
    { $match: id ? idMatchQuery : {} },
    { $match: searchQuery },
    { $count: 'totalCount' },
  ]);

  const totalData =
    totalDataAggregation.length > 0 ? totalDataAggregation[0].totalCount : 0;
  const totalPages = Math.ceil(totalData / limit);

  return { moneyReceipts, meta: { totalPages, currentPage: page } };
};

const getSingleMoneyReceiptDetails = async (
  tenantDomain: string,
  id: string,
) => {
  const tenant = await Tenant.findOne({
    domain: { $regex: new RegExp(`^${tenantDomain}$`, 'i') },
  });

  if (!tenant || !tenant.isActive) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Tenant not found or inactive');
  }

  const connection = await connectToTenantDatabase(
    tenant._id.toString(),
    tenant.dbUri,
  );

  const VehicleModel =
    connection.models.Vehicle || connection.model('Vehicle', vehicleSchema);
  const InvoiceModel =
    connection.models.Invoice || connection.model('Invoice', invoiceSchema);
  const MoneyReceipt =
    connection.models.MoneyReceipt ||
    connection.model('MoneyReceipt', moneyReceiptSchema);

  const singleMoneyReceipt = await MoneyReceipt.findById(id)
    .populate('vehicle')
    .populate('invoice');

  if (!singleMoneyReceipt) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No money receipt found');
  }

  const formattedInvoice = {
    ...singleMoneyReceipt.toObject(),
    total_amount: singleMoneyReceipt?.total_amount?.toLocaleString('en-IN'),
    advance: singleMoneyReceipt?.advance?.toLocaleString('en-IN'),
    remaining: singleMoneyReceipt?.remaining?.toLocaleString('en-IN'),
  };

  return formattedInvoice;
};



const deleteMoneyReceipt = async (tenantDomain: string, id: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { Model: MoneyReceipt } = await getTenantModel(
      tenantDomain,
      'MoneyReceipt',
    );
    const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
    const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
    const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');

    const existingMoneyReceipt =
      await MoneyReceipt.findById(id).session(session);

    if (!existingMoneyReceipt) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Money receipt not available.');
    }

    type UserType = 'customer' | 'company' | 'showRoom';
    type UserMap = {
      [key in UserType]: {
        model: typeof Customer | typeof Company | typeof ShowRoom;
        queryKey: string;
      };
    };

    const userTypeMap: UserMap = {
      customer: { model: Customer, queryKey: 'customerId' },
      company: { model: Company, queryKey: 'companyId' },
      showRoom: { model: ShowRoom, queryKey: 'showRoomId' },
    };

    const userTypeHandler =
      userTypeMap[existingMoneyReceipt.user_type as UserType];
    if (userTypeHandler) {
      const { model, queryKey } = userTypeHandler;
      const existingEntity = await model
        .findOne({ [queryKey]: existingMoneyReceipt.Id })
        .session(session);

      if (existingEntity) {
        await model.findByIdAndUpdate(
          existingEntity._id,
          { $pull: { money_receipts: id } },
          { new: true, runValidators: true, session },
        );
      }
    }

    const deleteMoneyReceipt = await MoneyReceipt.findByIdAndDelete(
      existingMoneyReceipt._id,
    ).session(session);

    if (!deleteMoneyReceipt) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No money receipt available');
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  return null;
};

export const generateMoneyPdf = async (
  tenantDomain: string,
  id: string,
  imageUrl: string,
  companyData: string,
): Promise<Buffer> => {
  const { Model: MoneyReceipt } = await getTenantModel(
    tenantDomain,
    'MoneyReceipt',
  );
  const companyProfile = JSON.parse(companyData || '{}');
  console.log('LIVE companyProfile:', companyProfile); // temporarily add
  const money = await MoneyReceipt.findById(id).populate('vehicle');
  if (!money) {
    throw new Error('Money receipt not found');
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

  const filePath = join(__dirname, '../../templates/money.ejs');

  const html = await new Promise<string>((resolve, reject) => {
    ejs.renderFile(
      filePath,
      {
        money,
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
    // const browser = await puppeteer.launch({
    //   executablePath: '/usr/bin/chromium-browser',
    //   args: ['--no-sandbox', '--disable-setuid-sandbox'],
    //   headless: true,
    // });
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN || '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
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

const permanantlyDeleteMoneyReceipt = async (
  tenantDomain: string,
  id: string,
) => {
  const { Model: MoneyReceipt, connection: tenantConnection } =
    await getTenantModel(tenantDomain, 'MoneyReceipt');
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
  const session = await tenantConnection.startSession();
  session.startTransaction();

  try {
    const existingMoneyReceipt =
      await MoneyReceipt.findById(id).session(session);

    if (!existingMoneyReceipt) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Money receipt not available.');
    }

    type UserType = 'customer' | 'company' | 'showRoom';
    type UserMap = {
      [key in UserType]: {
        model: mongoose.Model<any>;
        queryKey: string;
      };
    };

    const userTypeMap: UserMap = {
      customer: { model: Customer, queryKey: 'customerId' },
      company: { model: Company, queryKey: 'companyId' },
      showRoom: { model: ShowRoom, queryKey: 'showRoomId' },
    };

    const userTypeHandler =
      userTypeMap[existingMoneyReceipt.user_type as UserType];

    if (userTypeHandler) {
      const { model, queryKey } = userTypeHandler;

      const existingEntity = await model
        .findOne({ [queryKey]: existingMoneyReceipt.Id })
        .session(session);

      if (existingEntity) {
        await model.findByIdAndUpdate(
          existingEntity._id,
          { $pull: { money_receipts: id } },
          { new: true, runValidators: true, session },
        );
      }
    }

    const deleteMoneyReceipt = await MoneyReceipt.findByIdAndDelete(
      existingMoneyReceipt._id,
    ).session(session);

    if (!deleteMoneyReceipt) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No money receipt available');
    }

    await session.commitTransaction();
    session.endSession();
    return deleteMoneyReceipt;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const movetoRecyledbinMoneyReceipt = async (
  tenantDomain: string,
  id: string,
) => {
  try {
    const { Model: MoneyReceipt } = await getTenantModel(
      tenantDomain,
      'MoneyReceipt',
    );

    const existingMoneyReceipt = await MoneyReceipt.findById(id);

    if (!existingMoneyReceipt) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Money receipt not available.');
    }

    const recycledMoneyReceipt = await MoneyReceipt.findByIdAndUpdate(
      existingMoneyReceipt._id,
      { isRecycled: true, recycledAt: new Date() },
      { new: true, runValidators: true },
    );

    if (!recycledMoneyReceipt) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No money receipt available');
    }

    return recycledMoneyReceipt;
  } catch (error) {
    throw error;
  }
};

const restoreFromRecyledbinMoneyReceipt = async (
  tenantDomain: string,
  id: string,
) => {
  try {
    const { Model: MoneyReceipt } = await getTenantModel(
      tenantDomain,
      'MoneyReceipt',
    );

    const existingMoneyReceipt = await MoneyReceipt.findById(id);

    if (!existingMoneyReceipt) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Money receipt not available.');
    }

    if (!existingMoneyReceipt.isRecycled) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        'Money receipt is not in the recycle bin.',
      );
    }

    const restoredMoneyReceipt = await MoneyReceipt.findByIdAndUpdate(
      existingMoneyReceipt._id,
      { isRecycled: false, recycledAt: null },
      { new: true, runValidators: true },
    );

    if (!restoredMoneyReceipt) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No money receipt available');
    }

    return restoredMoneyReceipt;
  } catch (error) {
    throw error;
  }
};
const moveAllToRecycledBin = async () => {
  const result = await MoneyReceipt.updateMany(
    {},
    { $set: { isRecycled: true, recycledAt: new Date() } },
    { runValidators: true },
  );

  return result;
};
const restoreAllFromRecycledBin = async () => {
  const result = await MoneyReceipt.updateMany(
    { isRecycled: true },
    { $set: { isRecycled: false }, $unset: { recycledAt: '' } },
    { runValidators: true },
  );

  return result;
};

const getDueAllMoneyReceipts = async (
  tenantDomain: string,
  id: string | null,
  limit: number,
  page: number,
  searchTerm: string,
  isRecycled?: string,
) => {
  const { Model: MoneyReceipt } = await getTenantModel(
    tenantDomain,
    'MoneyReceipt',
  );

  let idMatchQuery: any = {};
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

    const moneyReceiptSearchQuery = SearchableFields.map((field) => ({
      [field]: { $regex: escapedFilteringData, $options: 'i' },
    }));

    const amountCondition = !isNaN(Number(searchTerm))
      ? [{ total_amount: Number(searchTerm) }]
      : [];
    const payableAmountCondition = !isNaN(Number(searchTerm))
      ? [{ remaining: Number(searchTerm) }]
      : [];

    searchQuery = {
      $or: [
        ...moneyReceiptSearchQuery,
        ...amountCondition,
        ...payableAmountCondition,
      ],
    };
  }

  if (isRecycled !== undefined) {
    searchQuery.isRecycled = isRecycled === 'true';
  }

  // Aggregation pipeline to get filtered money receipts
  const moneyReceipts = await MoneyReceipt.aggregate([
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
    { $match: { remaining: { $gt: 0 } } }, // Filter for due money receipts
    { $sort: { createdAt: -1 } },
    ...(page && limit
      ? [{ $skip: (page - 1) * limit }, { $limit: limit }]
      : []),
  ]);

  // Count total documents matching filters
  const totalDataAggregation = await MoneyReceipt.aggregate([
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
    { $match: { remaining: { $gt: 0 } } },
    { $count: 'totalCount' },
  ]);

  const totalData =
    totalDataAggregation.length > 0 ? totalDataAggregation[0].totalCount : 0;
  const totalPages = Math.ceil(totalData / limit);

  return { moneyReceipts, meta: { totalPages, currentPage: page } };
};

export const MoneyReceiptServices = {
  createMoneyReceiptDetails,
  getAllMoneyReceiptsFromDB,
  getSingleMoneyReceiptDetails,
  updateMoneyReceiptDetails,
  deleteMoneyReceipt,
  generateMoneyPdf,
  permanantlyDeleteMoneyReceipt,
  restoreFromRecyledbinMoneyReceipt,
  movetoRecyledbinMoneyReceipt,
  moveAllToRecycledBin,
  restoreAllFromRecycledBin,
  getDueAllMoneyReceipts,
};
