import { ObjectId } from 'mongoose';

export interface TPurchaseReturn {
  _id?: ObjectId;
  returnDate: Date;
  referenceNo: string;
    suppliers: ObjectId;
  purchase: ObjectId;
  warehouse: ObjectId;
  returnReason: string;
  returnNote?: string;
  status: 'pending' | 'completed' | 'cancelled';
  approvedBy?: ObjectId;
  approvedDate?: Date;
  items: {
    productId: ObjectId;
    productCode: string;
    productName: string;
    quantity: number;
    maxQuantity?: number;
    unitPrice: number;
    unit: string;
    totalAmount: number;
  }[];
  totalReturnAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPurchaseReturnPopulated {
  _id: ObjectId;
  returnDate: Date;
  referenceNo: string;
  supplier: {
    _id: ObjectId;
    full_name: string;
    supplierId: string;
  };
  purchase: {
    _id: ObjectId;
    referenceNo: string;
  };
  warehouse: {
    _id: ObjectId;
    name: string;
    warehouseId: string;
  };
  returnReason: string;
  returnNote?: string;
  status: 'pending' | 'completed' | 'cancelled';
  approvedBy?: {
    _id: ObjectId;
    name: string;
  };
  approvedDate?: Date;
  items: {
    productId: ObjectId;
    productCode: string;
    productName: string;
    quantity: number;
    maxQuantity?: number;
    unitPrice: number;
    unit: string;
    totalAmount: number;
  }[];
  totalReturnAmount: number;
  createdAt: Date;
  updatedAt: Date;
}