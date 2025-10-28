import mongoose, { Schema } from 'mongoose';
import { TAdjustment } from './adjustment.interface';

const productSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productCode: { type: String, required: true },
    type: {
      type: String,
      enum: ['Subtraction', 'Addition'],
      required: true,
    },
    quantity: { type: Number, required: true },
    serialNumber: { type: String },
  },
  { _id: false }
);

export const adjustmentSchema: Schema = new Schema<TAdjustment>(
  {
    date: { type: Date, required: true },
    referenceNo: { type: String, required: true, unique: true },
    attachDocument: { type: String },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    products: { type: [productSchema], required: true },
    note: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const Adjustment = mongoose.model<TAdjustment>('Adjustment', adjustmentSchema);
