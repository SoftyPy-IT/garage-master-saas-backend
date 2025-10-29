import { getTenantModel } from '../../utils/getTenantModels';

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
export const createStockTransfer = async (
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
      note?: string;
      batchNumber?: string;
    }>;
  }
): Promise<{ success: boolean; message?: string; data?: any }> => {

  const { Model: StockTransfer, connection } = await getTenantModel(tenantDomain, 'StockTransfer');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');
  const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const { referenceNo, date, fromWarehouse, toWarehouse, transferredBy, items } = transferData;
    const transferResults = [];

    for (const item of items) {
      const productId = item.product;
      const transferQty = Number(item.quantity);

      // check warehouse stock
      const sourceWarehouseStock = await WarehouseStock.findOne({
        warehouse: fromWarehouse,
        product: productId,
      }).session(session);

      const currentStock = sourceWarehouseStock?.quantity || 0;

      if (currentStock < transferQty) {
        throw new Error(
          `Insufficient stock for product ${productId} in source warehouse. Current stock: ${currentStock}, Requested: ${transferQty}`
        );
      }

      // create StockTransfer 
      const [transfer] = await StockTransfer.create(
        [
          {
            product: productId,
            fromWarehouse,
            toWarehouse,
            quantity: transferQty,
            transferId: referenceNo,
            batchNumber: item.batchNumber || null,
            note: item.note || '',
            transferredBy,
            date: new Date(date),
            status: 'completed',
          },
        ],
        { session }
      );

      // Stocks entries
      await Stocks.create(
        [
          {
            product: productId,
            warehouse: fromWarehouse,
            type: 'out',
            quantity: transferQty,
            referenceType: 'transfer',
            referenceId: transfer._id,
            date: new Date(date),
            batchNumber: item.batchNumber || null,
            note: item.note || '',
            purchasePrice: 0,
            sellingPrice: 0,
          },
        ],
        { session }
      );

      await Stocks.create(
        [
          {
            product: productId,
            warehouse: toWarehouse,
            type: 'in',
            quantity: transferQty,
            referenceType: 'transfer',
            referenceId: transfer._id,
            date: new Date(date),
            batchNumber: item.batchNumber || null,
            note: item.note || '',
            purchasePrice: 0,
            sellingPrice: 0,
          },
        ],
        { session }
      );

      // Update WarehouseStock -- decrease source
      sourceWarehouseStock.quantity -= transferQty;
      await sourceWarehouseStock.save({ session });

      // increase / create destination WarehouseStock
      const destWarehouseStock = await WarehouseStock.findOne({
        warehouse: toWarehouse,
        product: productId,
      }).session(session);

      if (destWarehouseStock) {
        destWarehouseStock.quantity += transferQty;
        await destWarehouseStock.save({ session });
      } else {
        await WarehouseStock.create(
          [
            {
              warehouse: toWarehouse,
              product: productId,
              quantity: transferQty,
            },
          ],
          { session }
        );
      }

      //Create StockTransaction logs.
      await StockTransaction.insertMany(
        [
          {
            product: productId,
            warehouse: fromWarehouse,
            quantity: transferQty,
            type: 'out',
            referenceType: 'transfer',
            referenceId: transfer._id,
            date: new Date(date),
          },
          {
            product: productId,
            warehouse: toWarehouse,
            quantity: transferQty,
            type: 'in',
            referenceType: 'transfer',
            referenceId: transfer._id,
            date: new Date(date),
          },
        ],
        { session, ordered: true }
      );

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
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error('Stock transfer failed:', error);
    return {
      success: false,
      message: error.message || 'Stock transfer failed',
    };
  }
};


export const deleteStockTransfer = async (
  tenantDomain: string,
  id: string,
): Promise<{ deleted: boolean; message?: string }> => {
  const { Model: StockTransfer, connection } = await getTenantModel(tenantDomain, 'StockTransfer');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');
  const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const stockTransfer = await StockTransfer.findById(id).session(session);
    if (!stockTransfer) {
      await session.abortTransaction();
      session.endSession();
      return { deleted: false, message: 'Stock transfer not found' };
    }

    const { product, fromWarehouse, toWarehouse, quantity, batchNumber, note } = stockTransfer;

    // 1️⃣ Reverse WarehouseStock adjustments
    // Return stock to source warehouse
    const fromWS = await WarehouseStock.findOne({ warehouse: fromWarehouse, product }).session(session);
    if (fromWS) {
      fromWS.quantity += quantity;
      await fromWS.save({ session });
    } else {
      await WarehouseStock.create([{ warehouse: fromWarehouse, product, quantity }], { session });
    }

    // Decrease stock from destination warehouse
    const toWS = await WarehouseStock.findOne({ warehouse: toWarehouse, product }).session(session);
    if (toWS) {
      toWS.quantity = Math.max(0, toWS.quantity - quantity); // prevent negative
      await toWS.save({ session });
    }

    // 2️⃣ Reverse Stock entries (log the reversal in Stocks)
    await Stocks.insertMany(
      [
        {
          product,
          warehouse: fromWarehouse,
          type: 'in',
          quantity,
          referenceType: 'transfer-reversal',
          referenceId: stockTransfer._id,
          batchNumber,
          note: `Reversal of transfer ${note || ''}`,
          date: new Date(),
          purchasePrice: 0,
          sellingPrice: 0,
        },
        {
          product,
          warehouse: toWarehouse,
          type: 'out',
          quantity,
          referenceType: 'transfer-reversal',
          referenceId: stockTransfer._id,
          batchNumber,
          note: `Reversal of transfer ${note || ''}`,
          date: new Date(),
          purchasePrice: 0,
          sellingPrice: 0,
        },
      ],
      { session, ordered: true }
    );

    // 3️⃣ Reverse StockTransaction logs
    await StockTransaction.insertMany(
      [
        {
          product,
          warehouse: fromWarehouse,
          quantity,
          type: 'in',
          referenceType: 'transfer-reversal',
          referenceId: stockTransfer._id,
          date: new Date(),
        },
        {
          product,
          warehouse: toWarehouse,
          quantity,
          type: 'out',
          referenceType: 'transfer-reversal',
          referenceId: stockTransfer._id,
          date: new Date(),
        },
      ],
      { session, ordered: true }
    );

    // 4️⃣ Delete original movement data
    await Stocks.deleteMany({ referenceType: 'transfer', referenceId: stockTransfer._id }).session(session);
    await StockTransaction.deleteMany({ referenceType: 'transfer', referenceId: stockTransfer._id }).session(session);
    await StockTransfer.deleteOne({ _id: id }).session(session);

    await session.commitTransaction();
    session.endSession();

    return { deleted: true, message: 'Stock transfer deleted and reversed successfully' };
  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    console.error('Delete stock transfer failed:', error);
    return { deleted: false, message: error.message || 'Failed to delete stock transfer' };
  }
};

export const updateStockTransfer = async (
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
  const { Model: StockTransfer, connection } = await getTenantModel(tenantDomain, 'StockTransfer');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const transferDocs = await StockTransfer.find({
      $or: [{ _id: id }, { transferId: id }, { _id: id }],
    }).session(session);

    if (!transferDocs.length) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, message: 'Stock transfer not found' };
    }

    const allowedUpdates = ['referenceNo', 'date', 'transferredBy', 'status', 'note'];
    const updates = Object.keys(updateData);

    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    if (!isValidOperation) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, message: 'Invalid update operation' };
    }

    // Apply updates to all transfer docs
    for (const transfer of transferDocs) {
      if (updateData.referenceNo !== undefined)
        transfer.transferId = updateData.referenceNo;
      if (updateData.date !== undefined)
        transfer.date = new Date(updateData.date);
      if (updateData.transferredBy !== undefined)
        transfer.transferredBy = updateData.transferredBy;
      if (updateData.status !== undefined)
        transfer.status = updateData.status;
      if (updateData.note !== undefined)
        transfer.note = updateData.note;

      await transfer.save({ session });

      // Update linked StockTransaction & Stocks (keep consistency)
      await StockTransaction.updateMany(
        { referenceType: 'transfer', referenceId: transfer._id },
        {
          ...(updateData.date && { date: new Date(updateData.date) }),
          ...(updateData.note && { note: updateData.note }),
        },
        { session }
      );

      await Stocks.updateMany(
        { referenceType: 'transfer', referenceId: transfer._id },
        {
          ...(updateData.date && { date: new Date(updateData.date) }),
          ...(updateData.note && { note: updateData.note }),
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: 'Stock transfer updated successfully',
      data: transferDocs,
    };
  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    console.error('Update stock transfer failed:', error);
    return { success: false, message: error.message || 'Failed to update stock transfer' };
  }
};

export const stockTransferServices = {
  getAllStockTransfers,
  createStockTransfer,
  deleteStockTransfer,
  updateStockTransfer
};