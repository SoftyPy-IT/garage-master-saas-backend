import type { Document, ObjectId } from "mongoose";
export interface IExpenseItem {
  name: string;
  amount: number;
}

export interface IExpense extends Document {
  date: string;
  invoice_id: string | ObjectId;
  invoiceCost?: number;
  expense_items: IExpenseItem[];
  payment_method: string;
  accountNumber?: string;
  transactionNumber?: string;
  note?: string;
   totalAmount?: number;
   totalOtherExpense?: number;
   referanceNo: number;

}

export interface IExpenseCategory extends Document {
  name: string
  code: string
  expenses?: ObjectId[]
}