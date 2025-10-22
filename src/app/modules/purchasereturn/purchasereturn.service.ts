import QueryBuilder from '../../builder/QueryBuilder';
import { TPurchaseReturn } from './purchasereturn.interface';
import { purchaseReturnSearch } from './purchasereturn.constant';
import { getTenantModel } from '../../utils/getTenantModels';
import { reCalcSupplierTotals } from '../supplier/supplier.service';

export const createPurchaseReturn = async (
  tenantDomain: string,
  payload: TPurchaseReturn,
) => {
  const { Model: PurchaseReturn, connection } = await getTenantModel(
    tenantDomain,
    'PurchaseReturn',
  );
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: StockTransaction } = await getTenantModel(
    tenantDomain,
    'StockTransaction',
  );
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const [newReturn] = await PurchaseReturn.create([payload], { session });

    // 🔹 Link suppliers
    if (payload.suppliers) {
      await Supplier.updateMany(
        { _id: { $in: payload.suppliers } },
        { $push: { purchaseReturn: newReturn._id } },
        { session },
      );

      // 🔹 Recalculate totals for affected suppliers
      const supplierIds = Array.isArray(payload.suppliers)
        ? payload.suppliers
        : [payload.suppliers];

      for (const supplierId of supplierIds) {
        await reCalcSupplierTotals(tenantDomain, supplierId.toString());
      }
    }

    // 🔹 Handle stock + stock transactions
    for (const item of payload.items) {
      const stockQuery = {
        product: item.productId,
        warehouse: payload.warehouse,
      };

      const existingStock = await Stocks.findOne(stockQuery).session(session);
      if (!existingStock) {
        throw new Error(
          `Stock not found for product ${item.productName} in warehouse ${payload.warehouse}`,
        );
      }

      if (existingStock.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for ${item.productName}. Available: ${existingStock.quantity}, Return Quantity: ${item.quantity}`,
        );
      }

      existingStock.quantity -= item.quantity;
      await existingStock.save({ session });

      // ✅ StockTransaction OUT
      await StockTransaction.create(
        [
          {
            product: item.productId,
            warehouse: payload.warehouse,
            quantity: item.quantity,
            type: 'out',
            referenceType: 'purchase-return',
            referenceId: newReturn._id,
            sellingPrice: item.unitPrice,
            date: new Date(),
          },
        ],
        { session },
      );

      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } },
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    return newReturn;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

export const updatePurchaseReturn = async (
  tenantDomain: string,
  id: string,
  payload: Partial<TPurchaseReturn>,
) => {
  const { Model: PurchaseReturn, connection } = await getTenantModel(
    tenantDomain,
    'PurchaseReturn',
  );
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: StockTransaction } = await getTenantModel(
    tenantDomain,
    'StockTransaction',
  );
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const existingReturn = await PurchaseReturn.findById(id).session(session);
    if (!existingReturn) throw new Error('Purchase return not found');

    // 🔹 Supplier re-link
    if (payload.suppliers) {
      // Remove old links
      if (existingReturn.suppliers?.length) {
        await Supplier.updateMany(
          { _id: { $in: existingReturn.suppliers } },
          { $pull: { purchaseReturn: existingReturn._id } },
          { session },
        );
      }

      // Add new links
      await Supplier.updateMany(
        { _id: { $in: payload.suppliers } },
        { $addToSet: { purchaseReturn: existingReturn._id } },
        { session },
      );

      // Recalculate totals for all affected suppliers
      const supplierIds = Array.isArray(payload.suppliers)
        ? payload.suppliers
        : [payload.suppliers];

      for (const supplierId of supplierIds) {
        await reCalcSupplierTotals(tenantDomain, supplierId.toString());
      }
    }

    // 🔹 Build map of old items
    const oldItemsMap = new Map<string, any>();
    existingReturn.items.forEach((item: any) =>
      oldItemsMap.set(item.productId.toString(), item),
    );

    const newItems = payload.items || existingReturn.items;

    for (const newItem of newItems) {
      const productId = newItem.productId.toString();
      const oldItem = oldItemsMap.get(productId);

      const warehouse = payload.warehouse || existingReturn.warehouse;

      if (!oldItem) {
        // ➕ New item added
        const stock = await Stocks.findOne({
          product: newItem.productId,
          warehouse,
        }).session(session);

        if (!stock)
          throw new Error(`Stock not found for ${newItem.productName}`);
        if (stock.quantity < newItem.quantity) {
          throw new Error(
            `Insufficient stock for ${newItem.productName}. Available: ${stock.quantity}, Needed: ${newItem.quantity}`,
          );
        }

        stock.quantity -= newItem.quantity;
        await stock.save({ session });

        // ✅ StockTransaction OUT
        await StockTransaction.create(
          [
            {
              product: newItem.productId,
              warehouse,
              quantity: newItem.quantity,
              type: 'out',
              referenceType: 'purchase-return',
              referenceId: existingReturn._id,
              sellingPrice: newItem.unitPrice,
              date: new Date(),
            },
          ],
          { session },
        );

        await Product.findByIdAndUpdate(
          newItem.productId,
          { $inc: { stock: -newItem.quantity } },
          { session },
        );
      } else {
        // ✏️ Existing item updated
        const diff = newItem.quantity - oldItem.quantity;
        if (diff !== 0) {
          const stock = await Stocks.findOne({
            product: newItem.productId,
            warehouse,
          }).session(session);

          if (!stock)
            throw new Error(`Stock not found for ${newItem.productName}`);
          if (diff > 0 && stock.quantity < diff) {
            throw new Error(
              `Insufficient stock for ${newItem.productName}. Available: ${stock.quantity}, Needed: ${diff}`,
            );
          }

          stock.quantity -= diff;
          await stock.save({ session });

          // ✅ StockTransaction OUT / IN
          await StockTransaction.create(
            [
              {
                product: newItem.productId,
                warehouse,
                quantity: Math.abs(diff),
                type: diff > 0 ? 'out' : 'in',
                referenceType: 'purchase-return',
                referenceId: existingReturn._id,
                sellingPrice: newItem.unitPrice,
                date: new Date(),
              },
            ],
            { session },
          );

          await Product.findByIdAndUpdate(
            newItem.productId,
            { $inc: { stock: -diff } },
            { session },
          );
        }
      }
    }

    // 🔹 Finally update purchase return
    const updatedReturn = await PurchaseReturn.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
      session,
    });

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

const deletePurchaseReturn = async (tenantDomain: string, id: string) => {
  const { Model: PurchaseReturn } = await getTenantModel(
    tenantDomain,
    'PurchaseReturn',
  );
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: StockTransaction } = await getTenantModel(
    tenantDomain,
    'StockTransaction',
  );
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');

  const session = await PurchaseReturn.startSession();
  session.startTransaction();

  try {
    const purchaseReturn = await PurchaseReturn.findById(id).session(session);
    if (!purchaseReturn) {
      throw new Error('Purchase return not found');
    }

    // 🔹 Reverse stock changes
    for (const item of purchaseReturn.items) {
      const stockQuery = {
        product: item.productId,
        warehouse: purchaseReturn.warehouse,
      };

      const stock = await Stocks.findOne(stockQuery).session(session);
      if (stock) {
        stock.quantity += item.quantity;
        await stock.save({ session });

        // ✅ StockTransaction IN (reversal)
        await StockTransaction.create(
          [
            {
              product: item.productId,
              warehouse: purchaseReturn.warehouse,
              quantity: item.quantity,
              type: 'in',
              referenceType: 'purchase-return-reversal',
              referenceId: purchaseReturn._id,
              sellingPrice: item.unitPrice,
              date: new Date(),
              note: 'Reversal of purchase return delete',
            },
          ],
          { session },
        );

        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } },
          { session },
        );
      }
    }

    // 🔹 Delete the purchase return itself
    await PurchaseReturn.deleteOne({ _id: id }, { session });

    // 🔹 Recalculate all suppliers totals
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
