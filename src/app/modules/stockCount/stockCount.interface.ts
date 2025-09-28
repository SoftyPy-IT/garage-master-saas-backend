import { Document, Model, ObjectId } from 'mongoose';

export interface IStockCount extends Document {
  startDate: Date;
  endDate: Date;
  reference: string;
  type: 'Partial' | 'Full';
  brands?: ObjectId[];
  categories?: ObjectId[];
  initialStockCSV: {
    url: string;
    publicId: string;
  };
  finalStockCSV?: {
    url: string;
    publicId: string;
  };
  isFinalCalculation: boolean;
  counts: {
    no: number;
    description: string;
    expected: number;
    counted: number;
    difference: number;
    cost: number;
  }[];
  note?: string;
}

export interface IStockModel extends Model<IStockCount> {

}
