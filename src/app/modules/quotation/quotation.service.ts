/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Model } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import sanitizePayload from '../../middlewares/updateDataValidation';
import {
  companyFields,
  customerFields,
  QuotationSearchableFields,
  showRoomFields,
  vehicleFields,
} from './quotation.const';
import { TQuotation } from './quotation.interface';
import { Quotation } from './quotation.model';
import { TCustomer } from '../customer/customer.interface';
import { TCompany } from '../company/company.interface';
import { TShowRoom } from '../showRoom/showRoom.interface';
import { Customer } from '../customer/customer.model';
import { Company } from '../company/company.model';
import { ShowRoom } from '../showRoom/showRoom.model';
import { TVehicle } from '../vehicle/vehicle.interface';
import { formatToIndianCurrency, generateQuotationNo } from './quotation.utils';
import puppeteer from 'puppeteer';
import { join } from 'path';
import ejs from 'ejs';
import { amountInWords } from '../../middlewares/taka-in-words';
import { getTenantModel } from '../../utils/getTenantModels';

export const createQuotationDetails = async (
  tenantDomain: string,
  payload: {
    customer: TCustomer;
    company: TCompany;
    showroom: TShowRoom;
    quotation: TQuotation;
    vehicle: TVehicle;
  },
) => {
  const { connection } = await getTenantModel(tenantDomain, 'Quotation');
  const session = await connection.startSession();
  session.startTransaction();

  try {
    const { customer, company, showroom, quotation, vehicle } = payload;
    const Quotation = (await getTenantModel(tenantDomain, 'Quotation')).Model;
    const Customer = (await getTenantModel(tenantDomain, 'Customer')).Model;
    const Company = (await getTenantModel(tenantDomain, 'Company')).Model;
    const ShowRoom = (await getTenantModel(tenantDomain, 'ShowRoom')).Model;
    const Vehicle = (await getTenantModel(tenantDomain, 'Vehicle')).Model;
    const Stocks = (await getTenantModel(tenantDomain, 'Stocks')).Model;
    const StockTransaction = (
      await getTenantModel(tenantDomain, 'StockTransaction')
    ).Model;
    const WarehouseStock = (
      await getTenantModel(tenantDomain, 'WarehouseStock')
    ).Model;
    const sanitizeCustomer = sanitizePayload(customer);
    const sanitizeCompany = sanitizePayload(company);
    const sanitizeShowroom = sanitizePayload(showroom);
    const sanitizeQuotation = sanitizePayload(quotation);
    const sanitizeVehicle = sanitizePayload(vehicle);

    // Check required totals
    if (
      sanitizeQuotation.parts_total === undefined ||
      sanitizeQuotation.service_total === undefined ||
      sanitizeQuotation.net_total === undefined
    ) {
      throw new AppError(400, 'Missing required total values in quotation');
    }

    // Generate quotation number and amounts in words
    const quotationNumber = await generateQuotationNo(tenantDomain);
    const partsInWords = amountInWords(sanitizeQuotation.parts_total);
    const serviceInWords = amountInWords(sanitizeQuotation.service_total);
    const netTotalInWords = amountInWords(sanitizeQuotation.net_total);

    // Create quotation
    const quotationData = new Quotation({
      ...sanitizeQuotation,
      quotation_no: quotationNumber,
      parts_total_in_words: partsInWords,
      service_total_in_words: serviceInWords,
      net_total_in_words: netTotalInWords,
    });

    await quotationData.save({ session });

    const { input_data = [], service_input_data = [] } = quotation;

    // Aggregate stock updates by product and warehouse only (without batchNumber)
    const productItems = input_data.filter(
      (item) => item.product && item.warehouse && item.quantity,
    );

    const stockUpdateMap = new Map<
      string,
      {
        product: string;
        warehouse: string;
        totalQuantity: number;
        product_name: string;
        sellingPrice: number;
        totalValue: number;
      }
    >();

    for (const item of productItems) {
      const {
        product,
        quantity = 0,
        warehouse,
        product_name,
        sellingPrice = 0,
      } = item;
      const key = `${product}-${warehouse}`;

      if (stockUpdateMap.has(key)) {
        const entry = stockUpdateMap.get(key)!;
        entry.totalQuantity += quantity;
        entry.totalValue += quantity * sellingPrice;
      } else {
        stockUpdateMap.set(key, {
          product: String(product),
          warehouse,
          totalQuantity: quantity,
          product_name,
          sellingPrice,
          totalValue: quantity * sellingPrice,
        });
      }
    }

    // Update stock and create transactions
    for (const {
      product,
      warehouse,
      totalQuantity,
      product_name,
      totalValue,
    } of stockUpdateMap.values()) {
      const averageSellingPrice = totalValue / totalQuantity;

      // Find existing stock record
      const existingStock = await Stocks.findOne({
        product,
        warehouse,
      }).session(session);

      if (!existingStock) {
        throw new AppError(
          404,
          `Stock for product "${product_name}" not found in warehouse.`,
        );
      }

      if (existingStock.quantity < totalQuantity) {
        throw new AppError(
          400,
          `Insufficient stock for "${product_name}". Available: ${existingStock.quantity}, Required: ${totalQuantity}`,
        );
      }

      // decrement Stocks entry (this is your batch/stock entry)
      existingStock.quantity -= totalQuantity;
      await existingStock.save({ session });

      // Create stock transaction (out)
      const stockTransaction = new StockTransaction({
        product,
        warehouse,
        quantity: totalQuantity,
        type: 'out',
        referenceType: 'sale',
        referenceId: quotationData._id,
        sellingPrice: averageSellingPrice,
        date: new Date(),
      });
      await stockTransaction.save({ session });

      // NEW: Update WarehouseStock
      const wsQuery = { product, warehouse };
      const warehouseStock =
        await WarehouseStock.findOne(wsQuery).session(session);

      if (!warehouseStock) {
        throw new AppError(
          404,
          `WarehouseStock record not found for product "${product_name}" in this warehouse.`,
        );
      }

      if (warehouseStock.quantity < totalQuantity) {
        throw new AppError(
          400,
          `Insufficient warehouse stock for "${product_name}". Warehouse available: ${warehouseStock.quantity}, Required: ${totalQuantity}`,
        );
      }

      warehouseStock.quantity -= totalQuantity;
      await warehouseStock.save({ session });
      // --------------------------------------------------------------------
    }

    // Link quotation to user
    if (quotation.user_type === 'customer') {
      const existingCustomer = await Customer.findOne({
        customerId: quotation.Id,
      }).session(session);
      if (existingCustomer) {
        await Customer.findByIdAndUpdate(
          existingCustomer._id,
          { $set: sanitizeCustomer, $push: { quotations: quotationData._id } },
          { new: true, runValidators: true, session },
        );
        quotationData.customer = existingCustomer._id;
        await quotationData.save({ session });
      }
    } else if (quotation.user_type === 'company') {
      const existingCompany = await Company.findOne({
        companyId: quotation.Id,
      }).session(session);
      if (existingCompany) {
        await Company.findByIdAndUpdate(
          existingCompany._id,
          { $set: sanitizeCompany, $push: { quotations: quotationData._id } },
          { new: true, runValidators: true, session },
        );
        quotationData.company = existingCompany._id;
        await quotationData.save({ session });
      }
    } else if (quotation.user_type === 'showRoom') {
      const existingShowRoom = await ShowRoom.findOne({
        showRoomId: quotation.Id,
      }).session(session);
      if (existingShowRoom) {
        await ShowRoom.findByIdAndUpdate(
          existingShowRoom._id,
          { $set: sanitizeShowroom, $push: { quotations: quotationData._id } },
          { new: true, runValidators: true, session },
        );
        quotationData.showRoom = existingShowRoom._id;
        await quotationData.save({ session });
      }
    }

    // Link with vehicle
    if (vehicle && vehicle.chassis_no) {
      const vehicleData = await Vehicle.findOneAndUpdate(
        { chassis_no: vehicle.chassis_no },
        { $set: { mileageHistory: vehicle.mileageHistory || [] } },
        { new: true, runValidators: true, session },
      );

      if (vehicleData) {
        quotationData.vehicle = vehicleData._id;
        await quotationData.save({ session });
      }
    }
    await session.commitTransaction();
    session.endSession();

    return quotationData;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const updateQuotationIntoDB = async (
  tenantDomain: string,
  id: string,
  payload: {
    customer: TCustomer;
    company: TCompany;
    showroom: TShowRoom;
    quotation: TQuotation;
    vehicle: TVehicle;
  },
) => {
  const { Model: Quotation, connection } = await getTenantModel(
    tenantDomain,
    'Quotation',
  );
  const Customer = (await getTenantModel(tenantDomain, 'Customer')).Model;
  const Company = (await getTenantModel(tenantDomain, 'Company')).Model;
  const ShowRoom = (await getTenantModel(tenantDomain, 'ShowRoom')).Model;
  const Vehicle = (await getTenantModel(tenantDomain, 'Vehicle')).Model;
  const Stocks = (await getTenantModel(tenantDomain, 'Stocks')).Model;
  const StockTransaction = (
    await getTenantModel(tenantDomain, 'StockTransaction')
  ).Model;
  const Product = (await getTenantModel(tenantDomain, 'Product')).Model;
  const WarehouseStock = (await getTenantModel(tenantDomain, 'WarehouseStock'))
    .Model;

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const { customer, company, showroom, quotation, vehicle } = payload;
    const sanitizeCustomer = sanitizePayload(customer);
    const sanitizeCompany = sanitizePayload(company);
    const sanitizeShowroom = sanitizePayload(showroom);
    const sanitizeQuotation = sanitizePayload(quotation);
    const sanitizeVehicle = sanitizePayload(vehicle);

    const partsInWords = amountInWords(sanitizeQuotation.parts_total as number);
    const serviceInWords = amountInWords(
      sanitizeQuotation.service_total as number,
    );
    const netTotalInWords = amountInWords(
      sanitizeQuotation.net_total as number,
    );

    const oldQuotation = await Quotation.findById(id).session(session);
    if (!oldQuotation)
      throw new AppError(StatusCodes.NOT_FOUND, 'No quotation found');

    const oldStockTransactions = await StockTransaction.find({
      referenceId: id,
      referenceType: 'sale',
    }).session(session);

    // --- STEP 1: Revert old transactions for Stocks, WarehouseStock, and Product ---
    for (const tx of oldStockTransactions) {
      const stockQuery: any = { product: tx.product, warehouse: tx.warehouse };
      const stock = await Stocks.findOne(stockQuery).session(session);
      if (stock) {
        stock.quantity += tx.quantity;
        await stock.save({ session });
      }

      const warehouseStock =
        await WarehouseStock.findOne(stockQuery).session(session);
      if (warehouseStock) {
        warehouseStock.quantity += tx.quantity;
        await warehouseStock.save({ session });
      }

      const product = await Product.findById(tx.product).session(session);
      if (product) {
        product.product_quantity =
          (product.product_quantity || 0) + tx.quantity;
        await product.save({ session });
      }
    }

    // Delete old transactions
    await StockTransaction.deleteMany({
      referenceId: id,
      referenceType: 'sale',
    }).session(session);

    // --- STEP 2: Update quotation details ---
    const updateQuotation = await Quotation.findByIdAndUpdate(
      id,
      {
        $set: {
          ...sanitizeQuotation,
          parts_total_in_words: partsInWords,
          service_total_in_words: serviceInWords,
          net_total_in_words: netTotalInWords,
        },
      },
      { new: true, runValidators: true, session },
    );

    if (!updateQuotation)
      throw new AppError(StatusCodes.NOT_FOUND, 'No quotation found');

    // --- STEP 3: Apply new sale transactions ---
    const { input_data = [] } = sanitizeQuotation;
    if (input_data.length > 0) {
      const stockUpdateMap = new Map<
        string,
        {
          product: string;
          warehouse: string;
          totalQuantity: number;
          product_name: string;
          sellingPrice: number;
        }
      >();

      for (const item of input_data) {
        const {
          product,
          quantity = 0,
          warehouse,
          product_name,
          sellingPrice = 0,
        } = item;
        if (!product || !warehouse) continue;

        const key = `${product}-${warehouse}`;
        if (stockUpdateMap.has(key)) {
          stockUpdateMap.get(key)!.totalQuantity += quantity;
        } else {
          stockUpdateMap.set(key, {
            product: String(product),
            warehouse,
            totalQuantity: quantity,
            product_name,
            sellingPrice,
          });
        }
      }

      for (const {
        product,
        warehouse,
        totalQuantity,
        product_name,
        sellingPrice,
      } of stockUpdateMap.values()) {
        const existingStock = await Stocks.findOne({
          product,
          warehouse,
        }).session(session);
        if (!existingStock)
          throw new AppError(404, `Stock not found for "${product_name}".`);

        if (existingStock.quantity < totalQuantity)
          throw new AppError(
            400,
            `Insufficient stock for "${product_name}". Available: ${existingStock.quantity}, Required: ${totalQuantity}`,
          );

        existingStock.quantity -= totalQuantity;
        await existingStock.save({ session });

        // Update WarehouseStock
        const warehouseStock = await WarehouseStock.findOne({
          product,
          warehouse,
        }).session(session);
        if (!warehouseStock)
          throw new AppError(
            404,
            `WarehouseStock not found for "${product_name}".`,
          );
        if (warehouseStock.quantity < totalQuantity)
          throw new AppError(
            400,
            `Insufficient warehouse stock for "${product_name}". Available: ${warehouseStock.quantity}, Required: ${totalQuantity}`,
          );

        warehouseStock.quantity -= totalQuantity;
        await warehouseStock.save({ session });

        // Record stock transaction
        const stockTransaction = new StockTransaction({
          product,
          warehouse,
          quantity: totalQuantity,
          type: 'out',
          referenceType: 'sale',
          referenceId: updateQuotation._id,
          sellingPrice,
          date: new Date(),
        });
        await stockTransaction.save({ session });

        // Update Product master
        const productData = await Product.findById(product).session(session);
        if (!productData) throw new AppError(404, `Product not found.`);
        if ((productData.product_quantity ?? 0) < totalQuantity)
          throw new AppError(
            400,
            `Insufficient product stock for "${product_name}". Available: ${productData.product_quantity}, Required: ${totalQuantity}`,
          );

        productData.product_quantity -= totalQuantity;
        productData.lastSoldDate = new Date().toISOString();
        await productData.save({ session });
      }
    }

    // --- STEP 4: Update user + vehicle data (same as before) ---
    if (quotation.user_type === 'customer') {
      const existingCustomer = await Customer.findOne({
        customerId: quotation.Id,
      }).session(session);
      if (existingCustomer)
        await Customer.findByIdAndUpdate(
          existingCustomer._id,
          { $set: sanitizeCustomer },
          { session },
        );
    } else if (quotation.user_type === 'company') {
      const existingCompany = await Company.findOne({
        companyId: quotation.Id,
      }).session(session);
      if (existingCompany)
        await Company.findByIdAndUpdate(
          existingCompany._id,
          { $set: sanitizeCompany },
          { session },
        );
    } else if (quotation.user_type === 'showRoom') {
      const existingShowRoom = await ShowRoom.findOne({
        showRoomId: quotation.Id,
      }).session(session);
      if (existingShowRoom)
        await ShowRoom.findByIdAndUpdate(
          existingShowRoom._id,
          { $set: sanitizeShowroom },
          { session },
        );
    }

    if (vehicle?.chassis_no) {
      await Vehicle.findOneAndUpdate(
        { chassis_no: vehicle.chassis_no },
        { $set: sanitizeVehicle },
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();
    return updateQuotation;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getAllQuotationsFromDB = async (
  tenantDomain: string,
  id: string | null,
  limit: number,
  page: number,
  searchTerm: string,
  isRecycled?: string,
  status?: string,
  isPending?: string,
) => {
  const Quotation = (await getTenantModel(tenantDomain, 'Quotation')).Model;

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

    const quotationSearchQuery = QuotationSearchableFields.map((field) => ({
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
  if (isPending !== undefined) {
    if (isPending === 'true') {
      searchQuery.isPending = true;
    } else {
      searchQuery.$nor = [...(searchQuery.$nor || []), { isPending: true }];
    }
  }
  if (status) {
    searchQuery.status = status;
  }

  // Use tenant-aware collection names
  const vehicleCollection = (await getTenantModel(tenantDomain, 'Vehicle'))
    .Model.collection.name;
  const companyCollection = (await getTenantModel(tenantDomain, 'Company'))
    .Model.collection.name;
  const customerCollection = (await getTenantModel(tenantDomain, 'Customer'))
    .Model.collection.name;
  const showRoomCollection = (await getTenantModel(tenantDomain, 'ShowRoom'))
    .Model.collection.name;

  const buildAggregationPipeline = (): mongoose.PipelineStage[] => {
    const pipeline: mongoose.PipelineStage[] = [
      {
        $lookup: {
          from: vehicleCollection,
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicle',
        },
      },
      { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: companyCollection,
          localField: 'company',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: customerCollection,
          localField: 'customer',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: showRoomCollection,
          localField: 'showRoom',
          foreignField: '_id',
          as: 'showRoom',
        },
      },
      { $unwind: { path: '$showRoom', preserveNullAndEmptyArrays: true } },
    ];

    if (id) {
      pipeline.push({ $match: idMatchQuery });
    }
    if (Object.keys(searchQuery).length > 0) {
      pipeline.push({ $match: searchQuery });
    }
    pipeline.push({ $sort: { createdAt: -1 } });
    if (page && limit) {
      pipeline.push({ $skip: (page - 1) * limit });
      pipeline.push({ $limit: limit });
    }
    return pipeline;
  };

  const quotations = await Quotation.aggregate(buildAggregationPipeline());

  const totalDataAggregation = await Quotation.aggregate([
    ...buildAggregationPipeline().filter(
      (stage) => !('$skip' in stage) && !('$limit' in stage),
    ),
    { $count: 'totalCount' },
  ] as any[]);

  const totalData =
    totalDataAggregation.length > 0 ? totalDataAggregation[0].totalCount : 0;
  const totalPages = Math.ceil(totalData / limit);

  return { quotations, meta: { totalData, totalPages, currentPage: page } };
};

const getAllQuotationsFromDBForDashboard = async () => {
  const completedQuotations = await Quotation.find({ isCompleted: true })
    .select('_id')
    .lean();

  return completedQuotations;
};

const getSingleQuotationDetails = async (tenantDomain: string, id: string) => {
  const Quotation = (await getTenantModel(tenantDomain, 'Quotation')).Model;
  const Customer = (await getTenantModel(tenantDomain, 'Customer')).Model;
  const Company = (await getTenantModel(tenantDomain, 'Company')).Model;
  const ShowRoom = (await getTenantModel(tenantDomain, 'ShowRoom')).Model;
  const Vehicle = (await getTenantModel(tenantDomain, 'Vehicle')).Model;

  const singleQuotation = await Quotation.findById(id)
    .populate({ path: 'customer', model: Customer })
    .populate({ path: 'company', model: Company })
    .populate({ path: 'showRoom', model: ShowRoom })
    .populate({ path: 'vehicle', model: Vehicle });

  if (!singleQuotation) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No quotation found');
  }

  const formattedInvoice = {
    ...singleQuotation.toObject(),
    net_total: singleQuotation.net_total.toLocaleString('en-IN'),
    service_total: singleQuotation.service_total.toLocaleString('en-IN'),
    total_amount: singleQuotation.total_amount.toLocaleString('en-IN'),
    parts_total: singleQuotation.parts_total.toLocaleString('en-IN'),
  };

  return formattedInvoice;
};

const generateQuotationPdf = async (
  tenantDomain: string,
  id: string,
  imageUrl: string,
  companyData: string,
): Promise<Buffer> => {
  const { Model: Quotation } = await getTenantModel(tenantDomain, 'Quotation');

  const quotation = await Quotation.findById(id)
    .populate('customer')
    .populate('company')
    .populate('showRoom')
    .populate('vehicle');
  const companyProfile = JSON.parse(companyData || '{}');
  if (!quotation) {
    throw new Error('quotation not found');
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

  const filePath = join(__dirname, '../../templates/quotation.ejs');

  const html = await new Promise<string>((resolve, reject) => {
    ejs.renderFile(
      filePath,
      {
        quotation,
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
      timeout: 60000,
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

const removeQuotationFromUpdate = async (
  tenantDomain: string,
  id: string,
  index: number,
  quotation_name: string,
) => {
  const Quotation = (await getTenantModel(tenantDomain, 'Quotation')).Model;

  const existingQuotation = await Quotation.findById(id);

  if (!existingQuotation) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No quotation exists.');
  }

  let updateQuotation;

  if (quotation_name === 'parts') {
    updateQuotation = await Quotation.findByIdAndUpdate(
      existingQuotation._id,
      { $pull: { input_data: { $eq: existingQuotation.input_data[index] } } },
      { new: true, runValidators: true },
    );
  } else if (quotation_name === 'service') {
    updateQuotation = await Quotation.findByIdAndUpdate(
      existingQuotation._id,
      {
        $pull: {
          service_input_data: {
            $eq: existingQuotation.service_input_data[index],
          },
        },
      },
      { new: true, runValidators: true },
    );
  }

  if (!updateQuotation) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No quotation found.');
  }

  return updateQuotation;
};
const deleteQuotation = async (tenantDomain: string, id: string) => {
  const Quotation = (await getTenantModel(tenantDomain, 'Quotation')).Model;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingQuotation = await Quotation.findById(id).session(session);

    if (!existingQuotation) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Quotation not available.');
    }

    type UserType = 'customer' | 'company' | 'showRoom';
    type UserMap = {
      [key in UserType]: { model: Model<any>; queryKey: string };
    };

    const userTypeMap: UserMap = {
      customer: { model: Customer, queryKey: 'customerId' },
      company: { model: Company, queryKey: 'companyId' },
      showRoom: { model: ShowRoom, queryKey: 'showRoomId' },
    };

    const userTypeHandler =
      userTypeMap[existingQuotation.user_type as UserType];
    if (userTypeHandler) {
      const { model, queryKey } = userTypeHandler;
      const existingEntity = await model
        .findOne({ [queryKey]: existingQuotation.Id })
        .session(session);
      if (existingEntity) {
        await model.findByIdAndUpdate(
          existingEntity._id,
          { $pull: { quotations: id } },
          { new: true, runValidators: true, session },
        );
      }
    }

    const deletedQuotation = await Quotation.findByIdAndDelete(
      existingQuotation._id,
    ).session(session);
    if (!deletedQuotation) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No quotation available');
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

const permanentlyDeleteQuotation = async (tenantDomain: string, id: string) => {
  const { Model: Quotation, connection: tenantConnection } =
    await getTenantModel(tenantDomain, 'Quotation');
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');

  const session = await tenantConnection.startSession();
  session.startTransaction();

  try {
    const existingQuotation = await Quotation.findById(id).session(session);

    if (!existingQuotation) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Quotation not available.');
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

    const userTypeHandler =
      userTypeMap[existingQuotation.user_type as UserType];

    if (userTypeHandler) {
      const { model, queryKey } = userTypeHandler;

      const existingEntity = await model
        .findOne({ [queryKey]: existingQuotation.Id })
        .session(session);

      if (existingEntity) {
        await model.findByIdAndUpdate(
          existingEntity._id,
          { $pull: { quotations: id } },
          { new: true, runValidators: true, session },
        );
      }
    }

    const deletedQuotation = await Quotation.findByIdAndDelete(
      existingQuotation._id,
    ).session(session);

    if (!deletedQuotation) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No quotation available');
    }

    await session.commitTransaction();
    session.endSession();
    return deletedQuotation;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const moveToRecyclebinQuotation = async (tenantDomain: string, id: string) => {
  const Quotation = (await getTenantModel(tenantDomain, 'Quotation')).Model;

  const existingQuotation = await Quotation.findById(id);
  if (!existingQuotation) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Quotation not available.');
  }

  const recycledQuotation = await Quotation.findByIdAndUpdate(
    existingQuotation._id,
    { isRecycled: true, recycledAt: new Date() },
    { new: true, runValidators: true },
  );

  if (!recycledQuotation) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No quotation available.');
  }

  return recycledQuotation;
};

const restoreFromRecyclebinQuotation = async (
  tenantDomain: string,
  id: string,
) => {
  const Quotation = (await getTenantModel(tenantDomain, 'Quotation')).Model;

  const existingQuotation = await Quotation.findById(id);
  if (!existingQuotation) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Quotation not available.');
  }

  const restoredQuotation = await Quotation.findByIdAndUpdate(
    existingQuotation._id,
    { isRecycled: false, recycledAt: null },
    { new: true, runValidators: true },
  );

  if (!restoredQuotation) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'Failed to restore the quotation.',
    );
  }

  return restoredQuotation;
};

const moveToPendingQuotation = async (tenantDomain: string, id: string) => {
  const Quotation = (await getTenantModel(tenantDomain, 'Quotation')).Model;

  const existingQuotation = await Quotation.findById(id);
  if (!existingQuotation) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Quotation not available.');
  }

  if (existingQuotation.isRecycled) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Recycled quotation cannot be moved to pending.',
    );
  }

  const pendingQuotation = await Quotation.findByIdAndUpdate(
    existingQuotation._id,
    { isPending: true, pendingAt: new Date() },
    { new: true, runValidators: true },
  );

  if (!pendingQuotation) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No quotation available.');
  }

  return pendingQuotation;
};

const restoreFromPendingQuotation = async (
  tenantDomain: string,
  id: string,
) => {
  const Quotation = (await getTenantModel(tenantDomain, 'Quotation')).Model;

  const existingQuotation = await Quotation.findById(id);
  if (!existingQuotation) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Quotation not available.');
  }

  const restoredQuotation = await Quotation.findByIdAndUpdate(
    existingQuotation._id,
    { isPending: false, pendingAt: null },
    { new: true, runValidators: true },
  );

  if (!restoredQuotation) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'Failed to restore the quotation.',
    );
  }

  return restoredQuotation;
};

export const QuotationServices = {
  createQuotationDetails,
  getAllQuotationsFromDB,
  getAllQuotationsFromDBForDashboard,
  getSingleQuotationDetails,
  updateQuotationIntoDB,
  deleteQuotation,
  removeQuotationFromUpdate,
  generateQuotationPdf,
  moveToRecyclebinQuotation,
  restoreFromRecyclebinQuotation,
  moveToPendingQuotation,
  restoreFromPendingQuotation,
  permanentlyDeleteQuotation,
};
