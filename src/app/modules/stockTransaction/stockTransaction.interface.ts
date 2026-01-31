import { ObjectId, Types } from 'mongoose';

export interface IStockTransaction {
  product: ObjectId;
  warehouse: ObjectId;
  quantity: number;
  batchNumber?: string;
  type: 'in' | 'out';
  referenceType?: string; 
  referenceId?: ObjectId;
  sellingPrice?: number;
  date?: Date;
}
