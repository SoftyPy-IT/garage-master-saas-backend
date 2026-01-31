import mongoose from 'mongoose';
import { getTenantModel } from '../../utils/getTenantModels';
import { TMoneyReceipt } from './money-receipt.interface';

const findLastMoneyReceiptId = async (
  MoneyReceiptModel: mongoose.Model<TMoneyReceipt>
): Promise<string | undefined> => {
  const lastMoneyReceipt = await MoneyReceiptModel.findOne({}, { moneyReceiptId: 1 })
    .sort({ createdAt: -1 })
    .lean<{ moneyReceiptId?: string }>();

  if (!lastMoneyReceipt?.moneyReceiptId) return undefined;

  const match = lastMoneyReceipt.moneyReceiptId.match(/(\d+)$/);
  return match ? match[1] : undefined;
};

export const generateMoneyReceiptId = async (tenantDomain: string): Promise<string> => {
  const { Model: MoneyReceipt } = await getTenantModel(tenantDomain, 'MoneyReceipt');

  const currentId = (await findLastMoneyReceiptId(MoneyReceipt)) || '0000';
  const incrementId = (Number(currentId) + 1).toString().padStart(4, '0');

  return `MR-${incrementId}`; // Example: MR-0001
};
