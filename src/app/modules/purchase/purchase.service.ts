/* eslint-disable @typescript-eslint/no-unused-vars */
import QueryBuilder from '../../builder/QueryBuilder';
import { TPurchase } from './purchase.interface';
import { getTenantModel } from '../../utils/getTenantModels';
import { reCalcSupplierTotals } from '../supplier/supplier.service';


export const createPurchase = async (tenantDomain: string, payload: any) => {
  const { Model: Purchase, connection } = await getTenantModel(tenantDomain, 'Purchase');
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');
  const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');
  const session = await connection.startSession();
  try {
    session.startTransaction();

    const [newPurchase] = await Purchase.create([payload], { session });

    let affectedSuppliers: string[] = [];

    if (payload.suppliers?.length) {
      for (const supplierId of payload.suppliers) {
        const supplier = await Supplier.findById(supplierId).session(session);
        if (!supplier) continue;

        if (!supplier.purchases.includes(newPurchase._id)) {
          supplier.purchases.push(newPurchase._id);
        }
        await supplier.save({ session });
        affectedSuppliers.push(supplierId.toString());
      }
    }


    if (payload.products?.length) {
      for (const item of payload.products) {
        const productId = item.productId;
        const quantity = Number(item.quantity) || 0;
        const warehouseId = Array.isArray(payload.warehouse)
          ? payload.warehouse[0]
          : payload.warehouse;
        const stockQuery: any = {
          product: productId,
          warehouse: warehouseId,
          type: 'in'
        };

        if (item.batchNumber) {
          stockQuery.batchNumber = item.batchNumber;
        }
        const existingStock = await Stocks.findOne(stockQuery).session(session);

        if (existingStock) {
          existingStock.quantity += quantity;
          await existingStock.save({ session });
        } else {
          const stock = await Stocks.create([{
            product: productId,
            warehouse: warehouseId,
            quantity: quantity,
            batchNumber: item.batchNumber || null,
            expiryDate: item.expiryDate || null,
            type: 'in',
            referenceType: 'purchase',
            referenceId: newPurchase._id,
            purchasePrice: Number(item.productPrice) || 0,
            date: new Date(),
          }], { session });
        }

        const wsQuery = {
          product: productId,
          warehouse: warehouseId
        };

        const warehouseStock = await WarehouseStock.findOne(wsQuery).session(session);


        if (warehouseStock) {
          warehouseStock.quantity += quantity;
          await warehouseStock.save({ session });
        } else {
          const newWarehouseStock = await WarehouseStock.create([{
            product: productId,
            warehouse: warehouseId,
            quantity: quantity,
          }], { session });
        }

        // Update Product total stock
        await Product.findByIdAndUpdate(
          productId,
          { $inc: { stock: quantity } },
          { session }
        );

        // Create stock transaction record
        await StockTransaction.create([{
          product: productId,
          warehouse: warehouseId,
          quantity: quantity,
          batchNumber: item.batchNumber || null,
          type: 'in',
          referenceType: 'purchase',
          referenceId: newPurchase._id,
          sellingPrice: Number(item.productPrice) || 0,
          date: new Date(),
        }], { session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    for (const supplierId of affectedSuppliers) {
      await reCalcSupplierTotals(tenantDomain, supplierId);
    }

    return newPurchase;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    console.error(' Purchase creation failed:', err);
    throw err;
  }
};
export const updatePurchase = async (
  tenantDomain: string,
  id: string,
  payload: Partial<TPurchase>
) => {
  const { Model: Purchase, connection } = await getTenantModel(tenantDomain, 'Purchase');
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const existingPurchase = await Purchase.findById(id).session(session);
    if (!existingPurchase) throw new Error('Purchase not found');
    if (existingPurchase.products?.length) {
      for (const oldItem of existingPurchase.products) {
        const productId = oldItem.productId;
        const quantity = Number(oldItem.quantity) || 0;
        const warehouseId = Array.isArray(existingPurchase.warehouse)
          ? existingPurchase.warehouse[0]
          : existingPurchase.warehouse;



        // Revert WarehouseStock
        const ws = await WarehouseStock.findOne({ product: productId, warehouse: warehouseId }).session(session);
        if (ws) {
          ws.quantity -= quantity;
          if (ws.quantity < 0) ws.quantity = 0;
          await ws.save({ session });
        }

        // Revert Product total
        await Product.findByIdAndUpdate(productId, { $inc: { stock: -quantity } }, { session });

        // Revert stock record
        const st = await Stocks.findOne({
          product: productId,
          warehouse: warehouseId,
          referenceId: id,
          referenceType: 'purchase'
        }).session(session);

        if (st) {
          st.quantity -= quantity;
          if (st.quantity <= 0) await Stocks.deleteOne({ _id: st._id }).session(session);
          else await st.save({ session });
        }

        // Remove stock transaction linked to this purchase
        await StockTransaction.deleteMany({
          referenceId: id,
          referenceType: 'purchase',
          product: productId
        }).session(session);
      }
    }

    const updatedPurchase = await Purchase.findByIdAndUpdate(id, payload, { new: true, session });

    if (payload.products?.length) {
      for (const item of payload.products) {
        const productId = item.productId;
        const quantity = Number(item.quantity) || 0;
        const warehouseId = Array.isArray(payload.warehouse)
          ? payload.warehouse[0]
          : payload.warehouse;

        // Update/create stock
        const stockQuery: any = {
          product: productId,
          warehouse: warehouseId,
          type: 'in',
          batchNumber: item.batchNumber || null,
          referenceType: 'purchase',
          referenceId: updatedPurchase._id,
        };

        const existingStock = await Stocks.findOne(stockQuery).session(session);
        if (existingStock) {
          existingStock.quantity += quantity;
          await existingStock.save({ session });
        } else {
          await Stocks.create([{
            product: productId,
            warehouse: warehouseId,
            quantity: quantity,
            batchNumber: item.batchNumber || null,
            expiryDate: item.expiryDate || null,
            type: 'in',
            referenceType: 'purchase',
            referenceId: updatedPurchase._id,
            purchasePrice: Number(item.productPrice) || 0,
            date: new Date(),
          }], { session });
        }

        // Update WarehouseStock
        const warehouseStock = await WarehouseStock.findOne({ product: productId, warehouse: warehouseId }).session(session);
        if (warehouseStock) {
          warehouseStock.quantity += quantity;
          await warehouseStock.save({ session });
        } else {
          await WarehouseStock.create([{
            product: productId,
            warehouse: warehouseId,
            quantity: quantity,
          }], { session });
        }

        // Update Product total stock
        await Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } }, { session });

        // Create new StockTransaction
        await StockTransaction.create([{
          product: productId,
          warehouse: warehouseId,
          quantity: quantity,
          batchNumber: item.batchNumber || null,
          type: 'in',
          referenceType: 'purchase',
          referenceId: updatedPurchase._id,
          sellingPrice: Number(item.productPrice) || 0,
          date: new Date(),
        }], { session });
      }
    }

    //  supplier link
    if (updatedPurchase.suppliers && updatedPurchase.suppliers.length) {
      for (const supplierId of updatedPurchase.suppliers) {
        const supplier = await Supplier.findById(supplierId).session(session);
        if (!supplier) continue;
        if (!supplier.purchases.includes(updatedPurchase._id)) {
          supplier.purchases.push(updatedPurchase._id);
        }
        await supplier.save({ session });
        await reCalcSupplierTotals(tenantDomain, supplierId);
      }
    }

    await session.commitTransaction();
    session.endSession();

    return updatedPurchase;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Update Purchase failed:', err);
    throw err;
  }
};


export const deletePurchase = async (tenantDomain: string, id: string) => {
  const { Model: Purchase, connection } = await getTenantModel(tenantDomain, 'Purchase');
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: Stocks } = await getTenantModel(tenantDomain, 'Stocks');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: StockTransaction } = await getTenantModel(tenantDomain, 'StockTransaction');
  const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const purchase = await Purchase.findById(id).session(session);
    if (!purchase) throw new Error('Purchase not found');

    const supplierIds = purchase.suppliers || [];
    const purchasePaidAmount = purchase.paidAmount || 0;
    const purchaseDueAmount = purchase.dueAmount || 0;

    // Remove the purchase ID from the suppliers' purchases array
    if (supplierIds.length) {
      await Supplier.updateMany(
        { _id: { $in: supplierIds } },
        { $pull: { purchases: id } },
        { session }
      );
    }

    // Update stock, warehouse stock, product totals, and create stock transactions
    if (purchase.products?.length) {
      for (const item of purchase.products) {
        const productId = item.productId;
        const quantity = Number(item.quantity) || 0;

        // Normalize warehouse (use first if it's an array)
        const warehouseId = Array.isArray(purchase.warehouse)
          ? purchase.warehouse[0]
          : purchase.warehouse;

        // Update Stocks collection
        const stockQuery: any = {
          product: productId,
          warehouse: warehouseId,
          type: 'in',
          batchNumber: item.batchNumber ?? null,
          referenceType: 'purchase',
          referenceId: purchase._id,
        };
        const existingStock = await Stocks.findOne(stockQuery).session(session);

        if (existingStock) {
          if (existingStock.quantity >= quantity) {
            existingStock.quantity -= quantity;
            if (existingStock.quantity <= 0) {
              await Stocks.deleteOne({ _id: existingStock._id }).session(session);
            } else {
              await existingStock.save({ session });
            }
          } else {
            throw new Error(
              `Insufficient stock. Current stock: ${existingStock.quantity}, trying to remove: ${quantity}`
            );
          }
        } else {
          throw new Error(`No stock record found for this product`);
        }

        // Update WarehouseStock collection
        const warehouseStock = await WarehouseStock.findOne({ product: productId, warehouse: warehouseId }).session(session);
        if (warehouseStock) {
          warehouseStock.quantity -= quantity;
          if (warehouseStock.quantity < 0) warehouseStock.quantity = 0;
          await warehouseStock.save({ session });
        }

        // Update total product stock
        await Product.findByIdAndUpdate(
          productId,
          { $inc: { stock: -quantity } },
          { session }
        );

        // Create a stock transaction log for this deletion
        await StockTransaction.create(
          [{
            product: productId,
            warehouse: warehouseId,
            quantity,
            batchNumber: item.batchNumber ?? null,
            type: 'out',
            referenceType: 'purchase_delete',
            referenceId: purchase._id,
            date: new Date(),
          }],
          { session }
        );
      }
    }

    // Delete the purchase record itself
    await Purchase.deleteOne({ _id: id }, { session });

    await session.commitTransaction();
    session.endSession();

    // Recalculate supplier totals after deletion
    for (const supplierId of supplierIds) {
      await reCalcSupplierTotals(tenantDomain, supplierId);
    }

    return {
      message: 'Purchase deleted successfully and stock updated',
      removedPaidAmount: purchasePaidAmount,
      removedDueAmount: purchaseDueAmount,
    };
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    console.error('Delete Purchase failed:', err);
    throw err;
  }
};


const getAllPurchase = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {
  const { Model: Purchase } = await getTenantModel(tenantDomain, 'Purchase');
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');

  const purchaseQuery = new QueryBuilder(Purchase.find(), query)
    .search(['invoiceNumber', 'notes'])
    .paginate()
    .fields();

  const meta = await purchaseQuery.countTotal();

  const purchases = await purchaseQuery.modelQuery.populate([
    { path: 'suppliers', model: Supplier, select: 'full_name' },
    { path: 'products.productId', model: Product },
  ]);

  const purchaseSummary = purchases.reduce(
    (acc, p) => {
      acc.paidAmount += p.paidAmount || 0;
      acc.dueAmount += p.dueAmount || 0;
      acc.shipping += p.shipping || 0;
      acc.totalAmount += p.totalAmount || 0;
      acc.totalDiscount += p.totalDiscount || 0;
      acc.totalTax += p.totalTax || 0;
      acc.totalShipping += p.totalShipping || 0;
      acc.grandTotal += p.grandTotal || 0;
      return acc;
    },
    {
      paidAmount: 0,
      dueAmount: 0,
      shipping: 0,
      totalAmount: 0,
      totalDiscount: 0,
      totalTax: 0,
      totalShipping: 0,
      grandTotal: 0,
    },
  );

  return {
    meta,
    purchases,
    purchaseSummary,
  };
};

const getSinglePurchase = async (tenantDomain: string, id: string) => {
  const { Model: Purchase } = await getTenantModel(tenantDomain, 'Purchase');
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: Warehouse } = await getTenantModel(tenantDomain, 'Warehouse');

  const result = await Purchase.findById(id).populate([
    { path: 'suppliers', model: Supplier, select: 'full_name' },
    { path: 'warehouse', model: Warehouse, select: 'name' },
  ]);
  return result;
};


export const purchaseServices = {
  createPurchase,
  getAllPurchase,
  getSinglePurchase,
  updatePurchase,
  deletePurchase,
};
