import mongoose, { Schema, model } from 'mongoose';
import { IIncome } from './income.interface';

export const incomeItemSchema = new Schema(
  {
    name: { type: String },
    amount: { type: Number },
  },
  { _id: false },
);

export const incomeSchema = new Schema<IIncome>(
  {
    date: { type: String },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      sparse: true,
    },
    income_items: { type: [incomeItemSchema] },
    serviceIncomeAmount: { type: Number, default: 0 },
    partsIncomeAmount: { type: Number, default: 0 },
    totalInvoiceIncome: { type: Number, default: 0 },
    payment_method: { type: String },
    accountNumber: { type: String },
    transactionNumber: { type: String },
    note: { type: String },
    totalAmount: { type: Number },
    totalOtherIncome: { type: Number },
    referenceNo: { type: Number },
  },
  { timestamps: true },
);

export const Income = model<IIncome>('Income', incomeSchema);
