import QueryBuilder from '../../builder/QueryBuilder';
import { TPurchaseReturn } from './purchasereturn.interface';
import { purchaseReturnSearch } from './purchasereturn.constant';
import { getTenantModel } from '../../utils/getTenantModels';
import { reCalcSupplierTotals } from '../supplier/supplier.service';

export const createPurchaseReturn = async (tenantDomain: string, payload: any) => {
  const { Model: PurchaseReturn, connection } = await getTenantModel(tenantDomain, 'PurchaseReturn');
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');
  const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');

  const session = await connection.startSession();
  session.startTransaction();

  try {

    const [newReturn] = await PurchaseReturn.create([payload], { session });

    // Link suppliers & recalc totals
    const affectedSuppliers: string[] = [];
    if (payload.suppliers?.length) {
      for (const supplierId of payload.suppliers) {
        const supplier = await Supplier.findById(supplierId).session(session);
        if (!supplier) continue;

        if (!supplier.purchaseReturn?.includes(newReturn._id)) {
          supplier.purchaseReturn = supplier.purchaseReturn || [];
          supplier.purchaseReturn.push(newReturn._id);
        }

        await supplier.save({ session });
        affectedSuppliers.push(supplierId.toString());
      }
    }

    // Process each returned item
    for (const item of payload.items) {
      const productId = item.productId;
      const quantity = Number(item.quantity);
      const warehouseId = Array.isArray(payload.warehouse)
        ? payload.warehouse[0]
        : payload.warehouse;

      const stockQuery: any = { product: productId, warehouse: warehouseId, type: 'in' };
      if (item.batchNumber) stockQuery.batchNumber = item.batchNumber;

      //Update Stocks
      const existingStock = await Stocks.findOne(stockQuery).session(session);
      if (!existingStock || existingStock.quantity < quantity) {
        throw new Error(
          `Insufficient stock for ${item.productName}. Available: ${existingStock?.quantity || 0}, Return Quantity: ${quantity}`
        );
      }
      existingStock.quantity -= quantity;
      await existingStock.save({ session });

      // Update WarehouseStock
      let warehouseStock = await WarehouseStock.findOne({ product: productId, warehouse: warehouseId }).session(session);
      if (!warehouseStock) {
        warehouseStock = new WarehouseStock({
          product: productId,
          warehouse: warehouseId,
          quantity: 0,
        });
      }
      warehouseStock.quantity -= quantity;
      if (warehouseStock.quantity < 0) {
        throw new Error(`Warehouse stock cannot be negative for ${item.productName}`);
      }
      await warehouseStock.save({ session });


      await Product.findByIdAndUpdate(productId, { $inc: { stock: -quantity } }, { session });

      //Create StockTransaction
      await StockTransaction.create([{
        product: productId,
        warehouse: warehouseId,
        quantity,
        batchNumber: item.batchNumber || null,
        type: 'out',
        referenceType: 'purchase-return',
        referenceId: newReturn._id,
        sellingPrice: item.unitPrice || 0,
        date: new Date(),
      }], { session });
    }
    await session.commitTransaction();
    session.endSession();
    for (const supplierId of affectedSuppliers) {
      await reCalcSupplierTotals(tenantDomain, supplierId);
    }

    return newReturn;
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    throw err;
  }
};


export const updatePurchaseReturn = async (
  tenantDomain: string,
  id: string,
  payload: Partial<TPurchaseReturn>,
) => {
  const { Model: PurchaseReturn, connection } = await getTenantModel(tenantDomain, 'PurchaseReturn');
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const existingReturn = await PurchaseReturn.findById(id).session(session);
    if (!existingReturn) throw new Error('Purchase return not found');

    const oldItemsMap = new Map<string, any>();
    existingReturn.items.forEach((item: any) => oldItemsMap.set(item.productId.toString(), item));
    const newItems = payload.items || existingReturn.items;

    const warehouseId = Array.isArray(payload.warehouse) ? payload.warehouse[0] : payload.warehouse || existingReturn.warehouse;

    //Handle supplier links
    if (payload.suppliers) {
      if (existingReturn.suppliers?.length) {
        await Supplier.updateMany(
          { _id: { $in: existingReturn.suppliers } },
          { $pull: { purchaseReturn: existingReturn._id } },
          { session }
        );
      }
      await Supplier.updateMany(
        { _id: { $in: payload.suppliers } },
        { $addToSet: { purchaseReturn: existingReturn._id } },
        { session }
      );

      //Recalculate affected suppliers totals
      const supplierIds = Array.isArray(payload.suppliers) ? payload.suppliers : [payload.suppliers];
      for (const supplierId of supplierIds) {
        await reCalcSupplierTotals(tenantDomain, supplierId.toString());
      }
    }

    //Process items
    for (const newItem of newItems) {
      const productId = newItem.productId.toString();
      const oldItem = oldItemsMap.get(productId);
      const quantity = Number(newItem.quantity);

      let diff = oldItem ? quantity - Number(oldItem.quantity) : quantity;

      // Update Stocks
      let stock = await Stocks.findOne({ product: productId, warehouse: warehouseId, type: 'in', batchNumber: newItem.batchNumber || undefined }).session(session);
      if (!stock) {
        if (diff > 0) throw new Error(`Stock not found for ${newItem.productName}`);
        stock = new Stocks({ product: productId, warehouse: warehouseId, quantity: 0, type: 'in', referenceType: 'purchase-return', referenceId: id, purchasePrice: newItem.unitPrice || 0 });
      }
      stock.quantity -= diff;
      if (stock.quantity < 0) throw new Error(`Insufficient stock for ${newItem.productName}`);
      await stock.save({ session });

      // Update WarehouseStock
      let warehouseStock = await WarehouseStock.findOne({ product: productId, warehouse: warehouseId }).session(session);
      if (!warehouseStock) warehouseStock = new WarehouseStock({ product: productId, warehouse: warehouseId, quantity: 0 });
      warehouseStock.quantity -= diff;
      if (warehouseStock.quantity < 0) throw new Error(`Warehouse stock cannot be negative for ${newItem.productName}`);
      await warehouseStock.save({ session });

      // Update Product total stock
      await Product.findByIdAndUpdate(productId, { $inc: { stock: -diff } }, { session });

      // Create StockTransaction for the difference
      await StockTransaction.create([{
        product: productId,
        warehouse: warehouseId,
        quantity: Math.abs(diff),
        batchNumber: newItem.batchNumber || null,
        type: diff > 0 ? 'out' : 'in',
        referenceType: 'purchase-return',
        referenceId: existingReturn._id,
        sellingPrice: newItem.unitPrice || 0,
        date: new Date(),
      }], { session });
    }
    const updatedReturn = await PurchaseReturn.findByIdAndUpdate(id, payload, { new: true, runValidators: true, session });

    await session.commitTransaction();
    session.endSession();

    return updatedReturn;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Update purchase return failed:', err);
    throw err;
  }
};


export const deletePurchaseReturn = async (tenantDomain: string, id: string) => {
  const { Model: PurchaseReturn, connection } = await getTenantModel(tenantDomain, 'PurchaseReturn');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const purchaseReturn = await PurchaseReturn.findById(id).session(session);
    if (!purchaseReturn) throw new Error('Purchase return not found');

    const warehouseId = Array.isArray(purchaseReturn.warehouse) ? purchaseReturn.warehouse[0] : purchaseReturn.warehouse;

    //Reverse stock and warehouse stock
    for (const item of purchaseReturn.items) {
      const productId = item.productId;
      let stock = await Stocks.findOne({ product: productId, warehouse: warehouseId, type: 'in', batchNumber: item.batchNumber || undefined }).session(session);
      if (!stock) stock = new Stocks({ product: productId, warehouse: warehouseId, quantity: 0, type: 'in', referenceType: 'purchase-return-reversal', referenceId: id });
      stock.quantity += Number(item.quantity);
      await stock.save({ session });

      // WarehouseStock
      let warehouseStock = await WarehouseStock.findOne({ product: productId, warehouse: warehouseId }).session(session);
      if (!warehouseStock) warehouseStock = new WarehouseStock({ product: productId, warehouse: warehouseId, quantity: 0 });
      warehouseStock.quantity += Number(item.quantity);
      await warehouseStock.save({ session });

      await Product.findByIdAndUpdate(productId, { $inc: { stock: Number(item.quantity) } }, { session });

      // StockTransaction reversal
      await StockTransaction.create([{
        product: productId,
        warehouse: warehouseId,
        quantity: Number(item.quantity),
        batchNumber: item.batchNumber || null,
        type: 'in',
        referenceType: 'purchase-return-reversal',
        referenceId: id,
        sellingPrice: item.unitPrice || 0,
        date: new Date(),
        note: 'Reversal of purchase return delete',
      }], { session });
    }
    await PurchaseReturn.deleteOne({ _id: id }, { session });
    if (purchaseReturn.suppliers?.length) {
      for (const supplierId of purchaseReturn.suppliers) {
        await reCalcSupplierTotals(tenantDomain, supplierId);
      }
    }

    await session.commitTransaction();
    session.endSession();

    return { message: 'Purchase return deleted successfully' };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Delete purchase return failed:', error);
    throw error;
  }
};


const getAllPurchaseReturns = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {
  const { Model: PurchaseReturn } = await getTenantModel(
    tenantDomain,
    'PurchaseReturn',
  );
  await getTenantModel(tenantDomain, 'Product');
  await getTenantModel(tenantDomain, 'Supplier');
  await getTenantModel(tenantDomain, 'Warehouse');

  const builder = new QueryBuilder(PurchaseReturn.find(), query)
    .search(purchaseReturnSearch)
    .paginate()
    .fields();

  const meta = await builder.countTotal();
  const data = await builder.modelQuery.populate([
    { path: 'items.productId', model: 'Product' },
    { path: 'suppliers', model: 'Supplier' },
    { path: 'warehouse', model: 'Warehouse' },
  ]);

  return {
    meta,
    returns: data,
  };
};

const getSinglePurchaseReturn = async (tenantDomain: string, id: string) => {
  const { Model: PurchaseReturn } = await getTenantModel(
    tenantDomain,
    'PurchaseReturn',
  );

  const result = await PurchaseReturn.findById(id).populate([
    { path: 'items.productId' },
    { path: 'suppliers' },
  ]);

  return result;
};

export const purchaseReturnServices = {
  createPurchaseReturn,
  getAllPurchaseReturns,
  getSinglePurchaseReturn,
  updatePurchaseReturn,
  deletePurchaseReturn,
};
