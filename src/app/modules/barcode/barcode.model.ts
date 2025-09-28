import { Schema, model } from 'mongoose';
import { IBarcode, IBarcodeModel } from './barcode.interface';

const barcodeSchema = new Schema<IBarcode, IBarcodeModel>(
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

barcodeSchema.statics.isBarcodeExist = async function (name: string) {
  return !!(await this.findOne({ name }));
};

const Barcode = model<IBarcode, IBarcodeModel>('Barcode', barcodeSchema);
export default Barcode;
