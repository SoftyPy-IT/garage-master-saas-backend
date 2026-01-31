import mongoose, { Schema } from 'mongoose';
import { TMoneyReceipt } from './money-receipt.interface';

export const moneyReceiptSchema: Schema<TMoneyReceipt> = new Schema<TMoneyReceipt>(
  {
    customer: {
      type: Schema.ObjectId,
      ref: 'Customer',
    },
    company: {
      type: Schema.ObjectId,
      ref: 'Company',
    },
    showRoom: {
      type: Schema.ObjectId,
      ref: 'ShowRoom',
    },
    vehicle: {
      type: Schema.ObjectId,
      ref: 'Vehicle',
    },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    moneyReceiptId: {
      type: String,
      required: [true, 'Money receipt id is required'],
    },
    Id: {
      type: String,
      required: [true, 'User id is required'],
    },
    user_type: {
      type: String,
      required: [true, 'User type is required'],
    },
    job_no: {
      type: String,
      required: [true, 'Order number is required'],
    },
    default_date: {
      type: String,
    },
    thanks_from: {
      type: String,
      required: [true, 'Thanks for is required'],
    },
    against_bill_no_method: {
      type: String,
      required: [true, 'Billing method is required'],
    },

    full_reg_number: {
      type: String,
    },
    chassis_no: {
      type: String,
    },
    date: {
      type: String,
    },

    payment_method: {
      type: String,
      required: [true, 'Payment method is required'],
    },
    transaction_id: {
      type: String,
    },

    check_date: {
      type: String,
    },

    bank_name: {
      type: String,
    },
    check_number: {
      type: String,
    },
    account_number: {
      type: String,
    },
    payment_date: {
      type: String,
    },
    total_amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    total_amount_in_words: {
      type: String,
      required: [true, 'Amount is required'],
    },
    advance: {
      type: Number,
      default: 0,
    },
    advance_in_words: {
      type: String,
    },
    remaining: {
      type: Number,
    },
    remaining_in_words: {
      type: String,
    },
    taka_in_word: {
      type: String,
    },
    cash_by: {
      type: String,
    },
    payment_status: {
      type: String,
      enum: ['advance', 'final'],
      default: 'advance',
    },

    isRecycled: { type: Boolean, default: false },
    recycledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

export const MoneyReceipt = mongoose.model<TMoneyReceipt>(
  'MoneyReceipt',
  moneyReceiptSchema,
);
