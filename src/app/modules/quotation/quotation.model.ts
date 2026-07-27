import mongoose, { Schema } from 'mongoose';
import { TQuotation } from './quotation.interface';

export const quotationSchema: Schema<TQuotation> = new Schema<TQuotation>(
  {
    quotation_no: {
      type: String,
      required: [true, 'Quotation number is required'],
    },
    user_type: {
      type: String,
      enum: ['customer', 'company', 'showRoom'],
    },
    Id: {
      type: String,
    },
    job_no: {
      type: String,
    },
    date: {
      type: String,
    },
    tax: {
      type: Number,
    },
    customer: {
      type: Schema.ObjectId,
      ref: 'Customer',
    },
    mileage: {
      type: Number,
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
    input_data: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        warehouse: { type: String },
        product_name: { type: String },
        quantity: Number,
        description: String,
        unit: String,
        rate: Number,
        total: Number,
        sellingPrice: Number,
        batchNumber: String,
      },
    ],
    service_input_data: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        warehouse: { type: String },
        product_name: { type: String },
        quantity: Number,
        unit: String,
        rate: Number,
        description: String,
        total: Number,
        sellingPrice: Number,
        batchNumber: String,
      },
    ],

    total_amount: {
      type: Number,
      required: [true, 'Total amount is required'],
    },
    parts_total: {
      type: Number,
      required: [true, 'Parts total amount is required'],
    },
    parts_total_In_words: {
      type: String,
      // required: [true, 'Parts total amount is required'],
    },
    service_total: {
      type: Number,
      required: [true, 'Service total amount is required'],
    },
    service_total_in_words: {
      type: String,
      required: [true, 'Service total amount is required'],
    },
    discount: {
      type: Number,
    },
    vat: {
      type: Number,
    },
    net_total: {
      type: Number,
      required: [true, 'Net total is required'],
    },
    logo: {
      type: String,
    },

    net_total_in_words: {
      type: String,
      required: [true, 'Net total is required'],
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['running', 'completed'],
      default: 'running',
    },
    isRecycled: { type: Boolean, default: false },
    recycledAt: { type: Date, default: null },
    isPending: { type: Boolean, default: false },
    pendingAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

export const Quotation = mongoose.model<TQuotation>(
  'Quotation',
  quotationSchema,
);
