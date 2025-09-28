import { ObjectId } from 'mongoose';

export interface TPurchase {
  date: Date;
  referenceNo: string;
  warehouse: ObjectId;
  attachDocument: string;
  suppliers: ObjectId;
  shipping: number;
  purchaseStatus: string;
paidAmount:number,
dueAmount:number,
  note: string;
  paymentMethod: string;
  totalAmount: number;
  totalDiscount: number;
  totalTax: number;
  totalShipping: number;
  grandTotal: number;
  products: {
    productId: ObjectId;
    productName: string;
    productUnit: string;
    discount: number | string;
    productPrice: number | string;
    tax: number | string;
    quantity: number | string;
    serialNumber?: string;
  }[];
}
