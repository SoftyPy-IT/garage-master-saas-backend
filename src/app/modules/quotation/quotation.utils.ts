import { getTenantModel } from '../../utils/getTenantModels';
import { TQuotation } from './quotation.interface';

export const generateQuotationNo = async (
  tenantDomain: string,
): Promise<string> => {
  const { Model: Quotation } = await getTenantModel(tenantDomain, 'Quotation');

  const lastQuotation = await Quotation.findOne({}, { quotation_no: 1 })
    .sort({ createdAt: -1 })
    .lean<TQuotation | null>();
  const currentId = lastQuotation?.quotation_no
    ? lastQuotation.quotation_no.substring(2)
    : '0000';
  const incrementId = (Number(currentId) + 1).toString().padStart(4, '0');

  return `Q-${incrementId}`;
};

export const formatToIndianCurrency = (amount: number): string => {
  return amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
};
