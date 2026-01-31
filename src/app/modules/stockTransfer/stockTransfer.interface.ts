import { Types } from 'mongoose';

export interface IStockTransfer {
  product: Types.ObjectId;
  fromWarehouse: Types.ObjectId;
  toWarehouse: Types.ObjectId;
  quantity: number;
  transferId: string;
  batchNumber: string;
  expiryDate?: Date;
  note?: string;
  transferredBy: string;
  date: Date;
  status: 'completed' | 'pending' | 'transit';
  createdAt?: Date;
  updatedAt?: Date;
}
