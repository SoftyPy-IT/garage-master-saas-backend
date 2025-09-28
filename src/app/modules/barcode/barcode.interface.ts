import { Document, Model, ObjectId } from 'mongoose';

export interface IBarcode extends Document {
  name: string;
  slug: string;
  description: string;
  barcode: {
    url: string;
    public_id: string;
  };
  product_id: ObjectId;
  isDeleted: boolean;
  deletedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBarcodeModel extends Model<IBarcode> {
  // eslint-disable-next-line no-unused-vars
  isBarcodeExist(name: string): Promise<boolean>;
}
