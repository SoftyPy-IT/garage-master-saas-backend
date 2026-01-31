// src/modules/stockTransaction/stockTransaction.services.ts
import { getTenantModel } from '../../utils/getTenantModels';
import { IStockTransaction } from './stockTransaction.interface';

const createStockTransaction = async (
  tenantDomain: string,
  payload: IStockTransaction,
): Promise<IStockTransaction> => {
  const { Model: StockTransaction } = await getTenantModel(
    tenantDomain,
    'StockTransaction',
  );
  const stockTransaction = await StockTransaction.create(payload);
  return stockTransaction;
};

export const getAllStockTransactions = async (
  tenantDomain: string,
): Promise<{
  totalTransactions: number;
  totalStockIn: number;
  totalStockOut: number;
  transactions: IStockTransaction[];
}> => {
  const { Model: StockTransaction } = await getTenantModel(
    tenantDomain,
    'StockTransaction',
  );

  // Make sure related models are registered before populate
  await getTenantModel(tenantDomain, 'Product');
  await getTenantModel(tenantDomain, 'Warehouse');
  await getTenantModel(tenantDomain, 'Purchase');
  await getTenantModel(tenantDomain, 'PurchaseReturn');

  const transactions = await StockTransaction.find()
    .populate({
      path: 'product',
      select: 'product_name',
    })
    .populate({
      path: 'warehouse',
      select: 'name location',
    })
    .populate({
      path: 'referenceId',
    })
    .exec();

  // Calculate totals
  let totalStockIn = 0;
  let totalStockOut = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'in') totalStockIn += tx.quantity;
    if (tx.type === 'out') totalStockOut += tx.quantity;
  });

  return {
    totalTransactions: transactions.length,
    totalStockIn,
    totalStockOut,
    transactions,
  };
};

const getSingleStockTransaction = async (
  tenantDomain: string,
  id: string,
): Promise<IStockTransaction | null> => {
  const { Model: StockTransaction } = await getTenantModel(
    tenantDomain,
    'StockTransaction',
  );
  const transaction = await StockTransaction.findById(id).populate([
    'product',
    'warehouse',
  ]);
  return transaction;
};

export const stockTransactionServices = {
  createStockTransaction,
  getAllStockTransactions,
  getSingleStockTransaction,
};
