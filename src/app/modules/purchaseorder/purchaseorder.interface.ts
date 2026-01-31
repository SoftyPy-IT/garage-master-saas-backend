import { ObjectId, Types } from 'mongoose';

export interface TPurchaseOrderProduct {
  productId: Types.ObjectId;
  productName: string;
  productUnit?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax?: number;
  shipping?: number;
  subtotal?: number;
  batchNumber?: string;
  expiryDate?: Date;    
}

export interface TPurchaseOrder {
  orderDate: string;
  expectedDeliveryDate?: string;
  receiveDate?: string;
  referenceNo: number;
  suppliers: ObjectId;
  warehouse: Types.ObjectId;
  status: 'Pending' | 'Approved' | 'Cancelled' | 'Shipped' | 'Received';
  products: TPurchaseOrderProduct[];
  totalAmount?: number;
  totalDiscount?: number;
  totalTax?: number;
  shipping: number;
  totalShipping?: number;
  grandTotal?: number;
  paymentMethod?: string;
  paymentStatus?: 'Unpaid' | 'Partial' | 'Paid';
  attachDocument?: string;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
