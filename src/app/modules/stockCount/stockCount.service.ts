import StockCount from './stockCount.model';
import QueryBuilder from '../../builder/QueryBuilder';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Request } from 'express';
import fs from 'fs';

import {
  calculateDifferences,
  generateCSVFile,
  getProducts,
  parseCSV,
  uploadToCloudinary,
} from './stockCount.utils';
import { deleteAttachment } from '../../utils/cloudinary';
import { IStockCount } from './stockCount.interface';

export const getAllStockCount = async (
  query: Record<string, unknown>,
): Promise<any> => {
  try {
    const StockSearchableFields = ['name'];

    const stockCountQuery = new QueryBuilder(
      StockCount.find({}).populate([
        { path: 'brands', select: 'name image brand' },
        { path: 'categories', select: 'main_category image' },
      ]),
      query,
    )
      .search(StockSearchableFields)
      .filter()
      .sort()
      .paginate()
      .fields();

    const meta = await stockCountQuery.countTotal();
    const stocks = await stockCountQuery.modelQuery;

    return { meta, stocks };
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Internal Server Error',
    );
  }
};

export const getStockCountById = async (id: string): Promise<IStockCount | null> => {
  try {
    const stock = await StockCount.findOne({ _id: id }).populate([
      { path: 'brands', select: 'brand image' },
      { path: 'categories', select: 'main_category image' },
    ]);

    if (!stock) {
      throw new AppError(httpStatus.NOT_FOUND, 'This Stock Count is not found');
    }

    if (stock.isFinalCalculation) {
      const totalDifference = stock.counts.reduce(
        (sum, count) => sum + count.difference,
        0,
      );
      const totalCost = stock.counts.reduce(
        (sum, count) => sum + count.cost,
        0,
      );
      stock.set('totalDifference', totalDifference, { strict: false });
      stock.set('totalCost', totalCost, { strict: false });
    }

    return stock;
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Internal Server Error',
    );
  }
};

export const createStockCount = async (req: Request) => {
  try {
    const products = await getProducts(req.body);

    if (!products || products.length === 0) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'No products found based on the provided criteria',
      );
    }

    const filePath = await generateCSVFile(products);
    const { url, public_id } = await uploadToCloudinary(filePath);
    fs.unlinkSync(filePath);

    const stockData = {
      ...req.body,
      initialStockCSV: { url, publicId: public_id },
    };
    const result = await StockCount.create(stockData);

    return {
      success: true,
      message: 'Stock Count created successfully',
      data: result,
    };
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Internal Server Error',
    );
  }
};

export const updateStockCount = async (id: string, req: Request) => {
  try {
    const stockExist = await StockCount.findById(id);
    if (!stockExist) {
      throw new AppError(httpStatus.NOT_FOUND, 'This Stock Count does not exist');
    }

    if (stockExist.isFinalCalculation) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You can't update a stock that has been finalized"
      );
    }

    const { file } = req;
    if (!file || file.mimetype !== 'text/csv') {
      throw new AppError(httpStatus.BAD_REQUEST, 'No file uploaded or file is not a CSV');
    }

    const { url, public_id } = await uploadToCloudinary(file);

    stockExist.finalStockCSV = { url, publicId: public_id };
    stockExist.note = req.body.note;
    stockExist.isFinalCalculation = true;

    const initialData = await parseCSV(stockExist.initialStockCSV.url);
    const finalData = await parseCSV(url);

    const comparisonData = await calculateDifferences(initialData, finalData);

    stockExist.counts = comparisonData?.map((item, index) => ({
      no: index + 1,
      description: item?.Description,
      expected: item?.Expected,
      counted: item?.Counted,
      difference: item?.Difference,
      cost: item?.Cost
    })) as any;

    await stockExist.save();

    return stockExist.counts;
  } catch (error: any) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Internal Server Error');
  }
};

export const deleteStockCount = async (id: string): Promise<void | null> => {
  try {
    const stockExist = await StockCount.findOne({ _id: id });
    if (!stockExist) {
      throw new AppError(httpStatus.NOT_FOUND, 'This Stock Count is not found');
    }

    await deleteAttachment(stockExist.initialStockCSV.publicId);
    if (stockExist.isFinalCalculation) {
      await deleteAttachment(stockExist?.finalStockCSV?.publicId as string);
    }

    await StockCount.findByIdAndDelete(id);

    return null;
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Internal Server Error',
    );
  }
};

export const StockCountService = {
  getAllStockCount,
  getStockCountById,
  createStockCount,
  updateStockCount,
  deleteStockCount,
};
