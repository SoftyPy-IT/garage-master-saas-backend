
import QueryBuilder from '../../builder/QueryBuilder';
import { adjustmentSearch } from './adjustment.constant';
import AppError from '../../errors/AppError';
import { getTenantModel } from '../../utils/getTenantModels';

export const createAdjustment = async (tenantDomain: string, payload: any) => {
  const { Model: Adjustment, connection } = await getTenantModel(tenantDomain, 'Adjustment');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');
  const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    //  Create adjustment record
    const [newAdjustment] = await Adjustment.create([payload], { session });
    const adjustmentId = newAdjustment._id;

    for (const item of payload.products) {
      const quantity = Number(item.quantity);
      const warehouseId = payload.warehouse;

      const stockQuery = { product: item.productId, warehouse: warehouseId };

      // 2️⃣ Stocks: get or create
      let existingStock = await Stocks.findOne(stockQuery).session(session);
      if (!existingStock && item.type === 'Subtraction') {
        throw new AppError(404, `No stock found for product ${item.productName}`);
      }

      if (!existingStock && item.type === 'Addition') {
        existingStock = new Stocks({
          product: item.productId,
          warehouse: warehouseId,
          quantity: 0,
          type: 'in',
          referenceType: 'adjustment',
          referenceId: adjustmentId,
          purchasePrice: 0,
          note: payload.note,
          date: payload.date,
        });
      }

      // 3️⃣ Adjust stock quantity
      if (item.type === 'Addition') {
        existingStock!.quantity += quantity;
      } else {
        if (existingStock!.quantity < quantity) {
          throw new AppError(
            400,
            `Insufficient stock for ${item.productName}. Available: ${existingStock!.quantity}, Trying to subtract: ${quantity}`
          );
        }
        existingStock!.quantity -= quantity;
      }
      await existingStock!.save({ session });

      // 4️⃣ Update WarehouseStock
      let warehouseStock = await WarehouseStock.findOne(stockQuery).session(session);
      if (!warehouseStock) {
        warehouseStock = new WarehouseStock({
          product: item.productId,
          warehouse: warehouseId,
          quantity: 0,
        });
      }
      warehouseStock.quantity += item.type === 'Addition' ? quantity : -quantity;
      if (warehouseStock.quantity < 0) {
        throw new AppError(
          400,
          `Warehouse stock cannot be negative for ${item.productName}.`
        );
      }
      await warehouseStock.save({ session });

      //  StockTransaction
      const stockTransaction = new StockTransaction({
        product: item.productId,
        warehouse: warehouseId,
        quantity,
        type: item.type === 'Addition' ? 'in' : 'out',
        referenceType: 'adjustment',
        referenceId: adjustmentId,
        batchNumber: item.batchNumber || null,
        note: payload.note,
        date: payload.date,
      });
      await stockTransaction.save({ session });
    }

    await session.commitTransaction();
    session.endSession();
    return newAdjustment;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating adjustment:', error.message);
    throw new AppError(
      error.statusCode || 500,
      error.message || 'Unexpected error while creating adjustment'
    );
  }
};





const getAllAdjustment = async (tenantDomain: string, query: Record<string, unknown>) => {
  const { Model: Adjustment } = await getTenantModel(tenantDomain, 'Adjustment');
  const categoryQuery = new QueryBuilder(Adjustment.find(), query)
    .search(adjustmentSearch)
    // .filter()
    // .sort()
    .paginate()
    .fields();

  const meta = await categoryQuery.countTotal();
  const adjustments = await categoryQuery.modelQuery;

  return {
    meta,
    adjustments,
  };
};

const getSinigleAdjustment = async (tenantDomain: string, id: string) => {
  const { Model: Adjustment } = await getTenantModel(tenantDomain, 'Adjustment');
  const result = await Adjustment.findById(id);
  return result;
};
export const updateAdjustment = async (tenantDomain: string, id: string, payload: any) => {
  const { Model: Adjustment, connection } = await getTenantModel(tenantDomain, 'Adjustment');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const existingAdjustment = await Adjustment.findById(id).session(session);
    if (!existingAdjustment) throw new AppError(404, 'Adjustment not found');

    //  Revert old adjustment
    for (const item of existingAdjustment.products) {
      const quantity = Number(item.quantity);
      const stockQuery = { product: item.productId, warehouse: existingAdjustment.warehouse };

      const stock = await Stocks.findOne(stockQuery).session(session);
      if (!stock) throw new AppError(404, `Stock not found for ${item.productName}`);
      stock.quantity += item.type === 'Subtraction' ? quantity : -quantity;
      await stock.save({ session });

      const warehouseStock = await WarehouseStock.findOne(stockQuery).session(session);
      if (!warehouseStock) throw new AppError(404, `Warehouse stock not found for ${item.productName}`);
      warehouseStock.quantity += item.type === 'Subtraction' ? quantity : -quantity;
      if (warehouseStock.quantity < 0) throw new AppError(400, `Warehouse stock cannot be negative for ${item.productName}`);
      await warehouseStock.save({ session });

      // Delete old stock transactions
      await StockTransaction.deleteMany({
        referenceType: 'adjustment',
        referenceId: existingAdjustment._id,
        product: item.productId,
        warehouse: existingAdjustment.warehouse
      }).session(session);
    }

    // Apply new adjustment
    existingAdjustment.set(payload);
    await existingAdjustment.save({ session });

    for (const item of payload.products) {
      const quantity = Number(item.quantity);
      const stockQuery = { product: item.productId, warehouse: payload.warehouse };

      let stock = await Stocks.findOne(stockQuery).session(session);
      if (!stock && item.type === 'Addition') {
        stock = new Stocks({
          product: item.productId,
          warehouse: payload.warehouse,
          quantity: 0,
          type: 'in',
          referenceType: 'adjustment',
          referenceId: id,
          purchasePrice: 0,
          note: payload.note,
          date: payload.date,
        });
      }
      if (!stock) throw new AppError(404, `Stock not found for ${item.productName}`);

      stock.quantity += item.type === 'Addition' ? quantity : -quantity;
      if (stock.quantity < 0) throw new AppError(400, `Insufficient stock for ${item.productName}`);
      await stock.save({ session });

      let warehouseStock = await WarehouseStock.findOne(stockQuery).session(session);
      if (!warehouseStock) {
        warehouseStock = new WarehouseStock({ product: item.productId, warehouse: payload.warehouse, quantity: 0 });
      }
      warehouseStock.quantity += item.type === 'Addition' ? quantity : -quantity;
      if (warehouseStock.quantity < 0) throw new AppError(400, `Warehouse stock cannot be negative for ${item.productName}`);
      await warehouseStock.save({ session });

      // Create new StockTransaction
      const stockTransaction = new StockTransaction({
        product: item.productId,
        warehouse: payload.warehouse,
        quantity,
        type: item.type === 'Addition' ? 'in' : 'out',
        referenceType: 'adjustment',
        referenceId: id,
        batchNumber: item.batchNumber || null,
        note: payload.note,
        date: payload.date,
      });
      await stockTransaction.save({ session });
    }

    await session.commitTransaction();
    session.endSession();
    return existingAdjustment;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(error.statusCode || 500, error.message || 'Error updating adjustment');
  }
};


export const deleteAdjustment = async (tenantDomain: string, id: string) => {
  const { Model: Adjustment, connection } = await getTenantModel(tenantDomain, 'Adjustment');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const existingAdjustment = await Adjustment.findById(id).session(session);
    if (!existingAdjustment) throw new AppError(404, 'Adjustment not found');

    // Revert stock and warehouse stock
    for (const item of existingAdjustment.products) {
      const quantity = Number(item.quantity);
      const stockQuery = { product: item.productId, warehouse: existingAdjustment.warehouse };

      const stock = await Stocks.findOne(stockQuery).session(session);
      if (!stock) throw new AppError(404, `Stock not found for ${item.productName}`);
      stock.quantity += item.type === 'Subtraction' ? quantity : -quantity;
      await stock.save({ session });

      const warehouseStock = await WarehouseStock.findOne(stockQuery).session(session);
      if (!warehouseStock) throw new AppError(404, `Warehouse stock not found for ${item.productName}`);
      warehouseStock.quantity += item.type === 'Subtraction' ? quantity : -quantity;
      if (warehouseStock.quantity < 0) throw new AppError(400, `Warehouse stock cannot be negative for ${item.productName}`);
      await warehouseStock.save({ session });

      // Delete stock transactions
      await StockTransaction.deleteMany({
        referenceType: 'adjustment',
        referenceId: existingAdjustment._id,
        product: item.productId,
        warehouse: existingAdjustment.warehouse
      }).session(session);
    }

    await Adjustment.deleteOne({ _id: id }).session(session);

    await session.commitTransaction();
    session.endSession();
    return null;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(error.statusCode || 500, error.message || 'Error deleting adjustment');
  }
};


export const adjustmentServices = {
  createAdjustment,
  getAllAdjustment,
  getSinigleAdjustment,
  updateAdjustment,
  deleteAdjustment,
};
