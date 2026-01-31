import { getTenantModel } from '../../utils/getTenantModels';
import { TInvoice } from './invoice.interface';

export const generateInvoiceNo = async (tenantDomain: string): Promise<string> => {
  const { Model: Invoice } = await getTenantModel(tenantDomain, 'Invoice');

  const lastInvoice = await Invoice.findOne({}, { invoice_no: 1 })
    .sort({ createdAt: -1 })
    .lean<TInvoice | null>();

  const currentId = lastInvoice?.invoice_no
    ? lastInvoice.invoice_no.substring(2)
    : '0000';

  const incrementId = (Number(currentId) + 1).toString().padStart(4, '0');
  return `I-${incrementId}`;
};

export const formatNumberWithCommas = (num: number): string => {
  return num.toLocaleString('en-IN');
};
