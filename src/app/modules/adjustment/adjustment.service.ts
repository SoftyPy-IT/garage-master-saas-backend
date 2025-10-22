/* eslint-disable @typescript-eslint/no-unused-vars */
import QueryBuilder from '../../builder/QueryBuilder';
import { Adjustment } from './adjustment.model';
import { adjustmentSearch } from './adjustment.constant';
import { TAdjustment } from './adjustment.interface';
import mongoose from 'mongoose';
import { Stocks } from '../stocks/stocks.model';
import { StockTransaction } from '../stockTransaction/stockTransaction.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

const createAdjustment = async (payload: any) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newAdjustment = await Adjustment.create([payload], { session });

    const adjustmentId = newAdjustment[0]._id;

    for (const item of payload.products) {
      const quantity = Number(item.quantity);
      const stockQuery = {
        product: item.productId,
        warehouse: payload.warehouse,
      };

      let existingStock = await Stocks.findOne(stockQuery).session(session);
      if(!existingStock){
        throw new AppError(httpStatus.NOT_FOUND,'Stock not found ')
      }

      // If subtracting and stock doesn't exist => error
      if (!existingStock && item.type === 'Subtraction') {
        throw new Error(`No stock found for product ${item.productName}`);
      }

      // If stock doesn't exist and it's an Addition => create new
      if (!existingStock && item.type === 'Addition') {
        existingStock = new Stocks({
          product: item.productId,
          warehouse: payload.warehouse,
          quantity: 0,
          type: 'in', // initial
          referenceType: 'adjustment',
          referenceId: adjustmentId,
          purchasePrice: 0,
          note: payload.note,
          date: payload.date,
        });
      }

      if (item.type === 'Addition') {
        existingStock!.quantity += quantity;
      } else if (item.type === 'Subtraction') {
        if (existingStock!.quantity < quantity) {
          throw new Error(
            `Insufficient stock for ${item.productName}. Available: ${existingStock!.quantity}, Trying to subtract: ${quantity}`
          );
        }
        existingStock!.quantity -= quantity;
      }

      await existingStock!.save({ session });

      // ➕ Create StockTransaction record
      const stockTransaction = new StockTransaction({
        product: item.productId,
        warehouse: payload.warehouse,
        quantity,
        type: item.type === 'Addition' ? 'in' : 'out',
        referenceType: 'adjustment',
        referenceId: adjustmentId,
        purchasePrice: 0,
        sellingPrice: 0,
        batchNumber: item.batchNumber || null,
        note: payload.note,
        date: payload.date,
      });

      await stockTransaction.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return newAdjustment[0];
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating adjustment:', error.message);
    throw new Error(
      error.message || 'An unexpected error occurred while creating the adjustment'
    );
  }
};


const getAllAdjustment = async (query: Record<string, unknown>) => {
  const categoryQuery = new QueryBuilder(Adjustment.find(), query)
    .search(adjustmentSearch)
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await categoryQuery.countTotal();
  const adjustments = await categoryQuery.modelQuery;

  return {
    meta,
    adjustments,
  };
};

const getSinigleAdjustment = async (id: string) => {
  const result = await Adjustment.findById(id);
  return result;
};
const updateAdjustment = async (id: string, payload: Partial<TAdjustment>) => {
  const result = await Adjustment.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteAdjustment = async (id: string) => {
  const result = await Adjustment.deleteOne({ _id: id });

  return result;
};

export const adjustmentServices = {
  createAdjustment,
  getAllAdjustment,
  getSinigleAdjustment,
  updateAdjustment,
  deleteAdjustment,
};
