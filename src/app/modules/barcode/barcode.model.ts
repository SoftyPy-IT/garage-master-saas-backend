import { Schema, model } from 'mongoose';
import { IBarcode } from './barcode.interface';

export const barcodeSchema = new Schema<IBarcode>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    barcode: {
      url: { type: String, required: true },
      public_id: { type: String, required: true }
    },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    isDeleted: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);


const Barcode = model<IBarcode>('Barcode', barcodeSchema);
export default Barcode;
