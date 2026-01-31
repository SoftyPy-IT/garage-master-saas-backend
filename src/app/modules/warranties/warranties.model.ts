import mongoose, { Schema } from 'mongoose';
import { TWarranty } from './warranties.interface';

export const warrantySchema: Schema<TWarranty> = new Schema<TWarranty>(
  {
    name: {
      type: String,
    },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    description: {
      type: String,
      default: '',
    },
    duration: {
      type: Number,
    },
    durationType: {
      type: String,
    },
    terms: {
      type: String,
    },
  },
  { timestamps: true },
);

export const Warranty = mongoose.model<TWarranty>('Warranty', warrantySchema);
