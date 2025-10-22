import mongoose from 'mongoose';
import { IStock } from './stock.interface';
import { getTenantModel } from '../../utils/getTenantModels';

export const createStock = async (
  tenantDomain: string,
  payload: IStock,
): Promise<IStock> => {
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stock');
  const stock = await Stocks.create(payload);
  return stock;
};

export const getSingleStock = async (
  tenantDomain: string,
  id: string,
): Promise<IStock | null> => {
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stock');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: Warehouse } = await getTenantModel(tenantDomain, 'Warehouse');

  const stock = await Stocks.findById(id).populate([
    { path: 'product', model: Product },
    { path: 'warehouse', model: Warehouse },
  ]);
  return stock;
};
export const updateStock = async (
  tenantDomain: string,
  id: string,
  payload: Partial<IStock>,
): Promise<IStock | null> => {
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stock');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: Warehouse } = await getTenantModel(tenantDomain, 'Warehouse');

  const updatedStock = await Stocks.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate([
    { path: 'product', model: Product },
    { path: 'warehouse', model: Warehouse },
  ]);

  return updatedStock;
};

export const deleteStock = async (
  tenantDomain: string,
  id: string,
): Promise<{ deleted: boolean }> => {
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stock');
  const result = await Stocks.findByIdAndDelete(id);
  return { deleted: !!result };
};
const getAllStocks = async (tenantDomain: string) => {
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stock');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: Warehouse } = await getTenantModel(tenantDomain, 'Warehouse');
  const { Model: Category } = await getTenantModel(tenantDomain, 'Category');
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: Brand } = await getTenantModel(tenantDomain, 'Brand');
  const { Model: ProductType } = await getTenantModel(tenantDomain, 'ProductType');
  const { Model: Unit } = await getTenantModel(tenantDomain, 'Unit');

  const stocks = await Stocks.aggregate([
    {
      $sort: { date: 1 }, // ✅ last purchase/selling ঠিকভাবে পেতে sort করা লাগবে
    },
    {
      $group: {
        _id: {
          product: '$product',
          warehouse: '$warehouse',
        },
        inQuantity: {
          $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$quantity', 0] },
        },
        outQuantity: {
          $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$quantity', 0] },
        },
        totalPurchaseValue: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'in'] },
              { $multiply: ['$quantity', '$purchasePrice'] },
              0,
            ],
          },
        },
        totalSellingValue: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'out'] },
              { $multiply: ['$quantity', '$sellingPrice'] },
              0,
            ],
          },
        },
        lastPurchasePrice: {
          $last: { $cond: [{ $eq: ['$type', 'in'] }, '$purchasePrice', null] },
        },
        lastSellingPrice: {
          $last: { $cond: [{ $eq: ['$type', 'out'] }, '$sellingPrice', null] },
        },
        allPurchasePrices: {
          $push: {
            $cond: [{ $eq: ['$type', 'in'] }, '$purchasePrice', '$$REMOVE'],
          },
        },
        allSellingPrices: {
          $push: {
            $cond: [{ $eq: ['$type', 'out'] }, '$sellingPrice', '$$REMOVE'],
          },
        },
      },
    },
    {
      $addFields: {
        stock: { $subtract: ['$inQuantity', '$outQuantity'] },
        avgPurchasePrice: {
          $cond: [
            { $gt: [{ $size: '$allPurchasePrices' }, 0] },
            { $avg: '$allPurchasePrices' },
            0,
          ],
        },
        avgSellingPrice: {
          $cond: [
            { $gt: [{ $size: '$allSellingPrices' }, 0] },
            { $avg: '$allSellingPrices' },
            0,
          ],
        },
      },
    },
    // Product Join
    {
      $lookup: {
        from: Product.collection.name,
        localField: '_id.product',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },

    // ✅ Calculate minimumSalePrice correctly
    {
      $addFields: {
        minimumSalePrice: {
          $cond: [
            { $ifNull: ['$product.minimumSalePrice', false] },
            '$product.minimumSalePrice',
            { $add: ['$product.purchasePrice', { $ifNull: ['$product.expense', 0] }] },
          ],
        },
        productPurchasePrice: '$product.purchasePrice',
        productSellingPrice: '$product.sellingPrice',
      },
    },

    // Warehouse join
    {
      $lookup: {
        from: Warehouse.collection.name,
        localField: '_id.warehouse',
        foreignField: '_id',
        as: 'warehouse',
      },
    },
    { $unwind: '$warehouse' },

    // Category join
    {
      $lookup: {
        from: Category.collection.name,
        localField: 'product.category',
        foreignField: '_id',
        as: 'product.category',
      },
    },
    {
      $unwind: { path: '$product.category', preserveNullAndEmptyArrays: true },
    },

    // Supplier join
    {
      $lookup: {
        from: Supplier.collection.name,
        localField: 'product.suppliers',
        foreignField: '_id',
        as: 'product.suppliers',
      },
    },

    // Brand join
    {
      $lookup: {
        from: Brand.collection.name,
        localField: 'product.brand',
        foreignField: '_id',
        as: 'product.brand',
      },
    },
    { $unwind: { path: '$product.brand', preserveNullAndEmptyArrays: true } },

    // ProductType join
    {
      $lookup: {
        from: ProductType.collection.name,
        localField: 'product.product_type',
        foreignField: '_id',
        as: 'product.product_type',
      },
    },
    {
      $unwind: { path: '$product.product_type', preserveNullAndEmptyArrays: true },
    },

    // Unit join
    {
      $lookup: {
        from: Unit.collection.name,
        localField: 'product.unit',
        foreignField: '_id',
        as: 'product.unit',
      },
    },
    { $unwind: { path: '$product.unit', preserveNullAndEmptyArrays: true } },
  ]);

  return stocks;
};


export const transferStock = async (
  tenantDomain: string,
  payload: {
    product: string;
    fromWarehouse: string;
    toWarehouse: string;
    quantity: number;
    note?: string;
    batchNumber?: string;
    expiryDate?: Date;
  },
) => {
  const {
    product,
    fromWarehouse,
    toWarehouse,
    quantity,
    note,
    batchNumber,
    expiryDate,
  } = payload;

  // Use same connection for session and all model access
  const { Model: Stocks, connection: tenantConnection } = await getTenantModel(
    tenantDomain,
    'Stocks',
  );
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: StockTransfer } = await getTenantModel(
    tenantDomain,
    'StockTransfer',
  );
  const { Model: StockTransaction } = await getTenantModel(
    tenantDomain,
    'StockTransaction',
  );

  // 🚨 Start session from the tenantConnection, not from mongoose
  const session = await tenantConnection.startSession();
  session.startTransaction();

  try {
    const currentStock = await calculateCurrentStock(
      tenantDomain,
      product,
      fromWarehouse,
      session,
    );

    if (currentStock < quantity) {
      throw new Error('There is not enough stock to transfer.');
    }

    const transferId = new mongoose.Types.ObjectId().toString();

    // Create stock records for the transfer
    await Stocks.create(
      [
        {
          product,
          warehouse: fromWarehouse,
          type: 'out',
          quantity,
          referenceType: 'transfer',
          sellingPrice: 0,
          note: `Transfer to warehouse ${toWarehouse}${note ? ` - ${note}` : ''}`,
          batchNumber,
          expiryDate,
          transferId,
        },
        {
          product,
          warehouse: toWarehouse,
          type: 'in',
          quantity,
          referenceType: 'transfer',
          purchasePrice: 0,
          note: `Transferred from warehouse ${fromWarehouse}${note ? ` - ${note}` : ''}`,
          batchNumber,
          expiryDate,
          transferId,
        },
      ],
      {
        session,
        runValidators: true,
        ordered: true, // ✅ REQUIRED FIX
      },
    );

    // Create StockTransfer record
    const transferRecord = await StockTransfer.create(
      [
        {
          product,
          fromWarehouse,
          toWarehouse,
          quantity,
          transferId,
          batchNumber,
          expiryDate,
          note,
        },
      ],
      { session },
    );

    // Create StockTransaction records for the transfer
    await StockTransaction.create(
      [
        {
          product,
          warehouse: fromWarehouse,
          quantity,
          type: 'out',
          referenceType: 'transfer',
          referenceId: transferRecord[0]._id,
          batchNumber,
          expiryDate,
          date: new Date(),
        },
        {
          product,
          warehouse: toWarehouse,
          quantity,
          type: 'in',
          referenceType: 'transfer',
          referenceId: transferRecord[0]._id,
          batchNumber,
          expiryDate,
          date: new Date(),
        },
      ],
      { session },
    );

    const newStockInToWarehouse = await calculateCurrentStock(
      tenantDomain,
      product,
      toWarehouse,
      session,
    );

    const newStockInFromWarehouse = await calculateCurrentStock(
      tenantDomain,
      product,
      fromWarehouse,
      session,
    );

    await Product.findByIdAndUpdate(
      product,
      {
        $set: {
          quantity: newStockInFromWarehouse + newStockInToWarehouse,
        },
      },
      { session },
    );

    await session.commitTransaction();
    return transferRecord[0];
  } catch (error) {
    await session.abortTransaction();
    console.error('স্টক ট্রান্সফার ব্যর্থ হয়েছে:', error);
    throw error;
  } finally {
    session.endSession();
  }
};


export const calculateCurrentStock = async (
  tenantDomain: string,
  productId: string,
  warehouseId: string,
  session?: mongoose.ClientSession,
): Promise<number> => {
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');

  const result = await Stocks.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
        warehouse: new mongoose.Types.ObjectId(warehouseId),
      },
    },
    {
      $group: {
        _id: null,
        totalIn: {
          $sum: {
            $cond: [{ $eq: ['$type', 'in'] }, '$quantity', 0],
          },
        },
        totalOut: {
          $sum: {
            $cond: [{ $eq: ['$type', 'out'] }, '$quantity', 0],
          },
        },
      },
    },
    {
      $project: {
        currentStock: { $subtract: ['$totalIn', '$totalOut'] },
      },
    },
  ]).session(session || null);

  return result[0]?.currentStock || 0;
};

export const stockServices = {
  createStock,
  getAllStocks,
  getSingleStock,
  updateStock,
  deleteStock,
  transferStock,
};

