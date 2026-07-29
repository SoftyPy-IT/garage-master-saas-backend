import type { Document, ObjectId } from 'mongoose';

export interface IIncomeItem {
  name: string;
  amount: number;
}

export interface IIncome extends Document {
  date: string;
  invoice_id?: ObjectId;
  income_items: IIncomeItem[];
  serviceIncomeAmount?: number;
  partsIncomeAmount?: number;
  totalInvoiceIncome?: number;
  payment_method: string;
  accountNumber?: string;
  transactionNumber?: string;
  note?: string;
  totalAmount?: number;
  totalOtherIncome: number;
  referenceNo: number;
}
