import type { Document, ObjectId } from "mongoose";

export interface IIncomeItem {
  name: string;
  amount: number;
}

export interface IIncome extends Document {
  date: string;
  income_items: IIncomeItem[];
  payment_method: string;
  accountNumber?: string;
  transactionNumber?: string;
  note?: string;
  totalAmount?: number;
  totalOtherIncome:number
  referanceNo:number
}
