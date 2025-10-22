// stockTransfer.services.ts
import mongoose from 'mongoose';
import { getTenantModel } from '../../utils/getTenantModels';
import { calculateCurrentStock } from '../stocks/stocks.service';

const getAllStockTransfers = async (tenantDomain: string) => {
  const { Model: StockTransfer } = await getTenantModel(
    tenantDomain,
    'StockTransfer',
  );

  const transfers = await StockTransfer.find()
    .populate(['product', 'fromWarehouse', 'toWarehouse'])
    .sort({ createdAt: -1 });

  return transfers;
};

const createStockTransfer = async (
  tenantDomain: string,
  transferData: {
    referenceNo: string;
    date: string;
    fromWarehouse: string;
    toWarehouse: string;
    transferredBy: string;
    items: Array<{
      product: string;
      quantity: number;
      note: string;
      batchNumber: string;
    }>;
  }
): Promise<{ success: boolean; message?: string; data?: any }> => {
  const { Model: StockTransfer, connection } = await getTenantModel(
    tenantDomain,
    'StockTransfer',
  );

  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const { referenceNo, date, fromWarehouse, toWarehouse, transferredBy, items } = transferData;
    const transferResults = [];

    for (const item of items) {
      // Use proper aggregation to calculate current stock
      const stockAggregation = await Stocks.aggregate([
        {
          $match: {
            product: new mongoose.Types.ObjectId(item.product),
            warehouse: new mongoose.Types.ObjectId(fromWarehouse),
          }
        },
        {
          $group: {
            _id: null,
            totalIn: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$quantity', 0] } },
            totalOut: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$quantity', 0] } }
          }
        }
      ]).session(session);

      const currentStock = stockAggregation.length > 0 
        ? stockAggregation[0].totalIn - stockAggregation[0].totalOut 
        : 0;

      if (currentStock < item.quantity) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          message: `Insufficient stock for product ${item.product} in source warehouse. Current stock: ${currentStock}, Requested: ${item.quantity}`,
        };
      }

      // Create stock transfer record
      const transfer = new StockTransfer({
        product: item.product,
        fromWarehouse,
        toWarehouse,
        quantity: item.quantity,
        transferId: referenceNo,
        batchNumber: item.batchNumber,
        note: item.note,
        transferredBy,
        date: new Date(date),
        status: 'completed',
      });

      await transfer.save({ session });

      // Create stock record for source warehouse (out transaction)
      const sourceStockOut = new Stocks({
        product: item.product,
        warehouse: fromWarehouse,
        type: 'out',
        quantity: item.quantity,
        referenceType: 'transfer',
        referenceId: transfer._id,
        date: new Date(date),
        batchNumber: item.batchNumber,
        note: item.note,
        purchasePrice: 0,
        sellingPrice: 0, 
      });

      await sourceStockOut.save({ session });

      // FIXED: Create stock transaction for source warehouse (out)
      const sourceTransaction = new StockTransaction({
        product: item.product,
        warehouse: fromWarehouse,
        quantity: item.quantity,
        type: 'out',
        referenceType: 'transfer',
        referenceId: transfer._id,
        date: new Date(date),
      });

      await sourceTransaction.save({ session });

      // FIXED: Create stock record for destination warehouse (in transaction)
      const destStockIn = new Stocks({
        product: item.product,
        warehouse: toWarehouse,
        type: 'in',
        quantity: item.quantity,
        referenceType: 'transfer',
        referenceId: transfer._id,
        date: new Date(date),
        batchNumber: item.batchNumber,
        note: item.note,
     
        purchasePrice: 0,
        sellingPrice: 0,
      });

      await destStockIn.save({ session });

      // FIXED: Create stock transaction for destination warehouse (in)
      const destTransaction = new StockTransaction({
        product: item.product,
        warehouse: toWarehouse,
        quantity: item.quantity,
        type: 'in',
        referenceType: 'transfer',
        referenceId: transfer._id,
        date: new Date(date),
      });

      await destTransaction.save({ session });

      transferResults.push(transfer);
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: 'Stock transfer completed successfully',
      data: transferResults,
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('Stock transfer failed:', error);
    return {
      success: false,
      message: error.message || 'Stock transfer failed',
    };
  }
};


const deleteStockTransfer = async (
  tenantDomain: string,
  id: string,
): Promise<{ deleted: boolean; message?: string }> => {
  const { Model: StockTransfer, connection } = await getTenantModel(
    tenantDomain,
    'StockTransfer',
  );
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    // find stock transper
    const stockTransfer = await StockTransfer.findById(id).session(session);
    if (!stockTransfer) {
      await session.abortTransaction();
      session.endSession();
      return { deleted: false, message: 'Do not find stock transfer' };
    }

    // reverse transaction make
    // ১. source warehouse stock return  
    const sourceReversalStock = new Stocks({
      product: stockTransfer.product,
      warehouse: stockTransfer.fromWarehouse,
      type: 'in',
      quantity: stockTransfer.quantity,
      referenceType: 'transfer',
      referenceId: stockTransfer._id,
      date: new Date(),
      batchNumber: stockTransfer.batchNumber,
      note: `reverse: ${stockTransfer.note || ''}`,
      purchasePrice: 0,
      sellingPrice: 0,
    });

    await sourceReversalStock.save({ session });

    // source warehouse stock transaction make
    const sourceReversalTransaction = new StockTransaction({
      product: stockTransfer.product,
      warehouse: stockTransfer.fromWarehouse,
      quantity: stockTransfer.quantity,
      type: 'in',
      referenceType: 'transfer',
      referenceId: stockTransfer._id,
      date: new Date(),
    });

    await sourceReversalTransaction.save({ session });

    // ২. stock out from destination warehouse 
    const destReversalStock = new Stocks({
      product: stockTransfer.product,
      warehouse: stockTransfer.toWarehouse,
      type: 'out',
      quantity: stockTransfer.quantity,
      referenceType: 'transfer',
      referenceId: stockTransfer._id,
      date: new Date(),
      batchNumber: stockTransfer.batchNumber,
      note: `reverse: ${stockTransfer.note || ''}`,
      purchasePrice: 0,
      sellingPrice: 0,
    });

    await destReversalStock.save({ session });

    // stock transaction make for destination warehouse 
    const destReversalTransaction = new StockTransaction({
      product: stockTransfer.product,
      warehouse: stockTransfer.toWarehouse,
      quantity: stockTransfer.quantity,
      type: 'out',
      referenceType: 'transfer',
      referenceId: stockTransfer._id,
      date: new Date(),
    });

    await destReversalTransaction.save({ session });

    // ৩. delete original stock transaction 
    await StockTransaction.deleteMany(
      { referenceType: 'transfer', referenceId: stockTransfer._id },
      { session }
    );

    // ৪. delete stock transfer
    await StockTransfer.deleteOne({ _id: id }, { session });

    // ৫. count stock quantity again
    const fromWarehouseStock = await calculateCurrentStock(
      tenantDomain,
      stockTransfer.product,
      stockTransfer.fromWarehouse,
      session,
    );
    
    const toWarehouseStock = await calculateCurrentStock(
      tenantDomain,
      stockTransfer.product,
      stockTransfer.toWarehouse,
      session,
    );

    await Product.findByIdAndUpdate(
      stockTransfer.product,
      {
        $set: {
          quantity: fromWarehouseStock + toWarehouseStock,
        },
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();
    return { deleted: true, message: 'Deleted stock transfer successfully' };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('Do not delete stock transfer:', error);
    return { deleted: false, message: error.message || 'Failed to deleted stock transfer !' };
  }
};
const updateStockTransfer = async (
  tenantDomain: string,
  id: string,
  updateData: {
    referenceNo?: string;
    date?: string;
    transferredBy?: string;
    status?: string;
    note?: string;
  }
): Promise<{ success: boolean; message?: string; data?: any }> => {
  const { Model: StockTransfer, connection } = await getTenantModel(
    tenantDomain,
    'StockTransfer',
  );

  const session = await connection.startSession();
  session.startTransaction();

  try {
    // Find the stock transfer record
    const stockTransfer = await StockTransfer.findById(id).session(session);
    if (!stockTransfer) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, message: 'Stock transfer not found' };
    }

    // Fields allowed for update
    const allowedUpdates = ['referenceNo', 'date', 'transferredBy', 'status', 'note'];
    const updates = Object.keys(updateData);
    
    // Check if attempting to update invalid fields
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    
    if (!isValidOperation) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, message: 'Invalid update operation' };
    }

    // Update fields with explicit type handling
    if (updateData.referenceNo !== undefined) {
      stockTransfer.referenceNo = updateData.referenceNo;
    }
    
    if (updateData.date !== undefined) {
      stockTransfer.date = new Date(updateData.date);
    }
    
    if (updateData.transferredBy !== undefined) {
      stockTransfer.transferredBy = updateData.transferredBy;
    }
    
    if (updateData.status !== undefined) {
      stockTransfer.status = updateData.status;
    }
    
    if (updateData.note !== undefined) {
      stockTransfer.note = updateData.note;
    }

    await stockTransfer.save({ session });

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: 'Stock transfer updated successfully',
      data: stockTransfer,
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating stock transfer:', error);
    return {
      success: false,
      message: error.message || 'Failed to update stock transfer',
    };
  }
};
export const stockTransferServices = {
  getAllStockTransfers,
  createStockTransfer,
  deleteStockTransfer,
  updateStockTransfer
};