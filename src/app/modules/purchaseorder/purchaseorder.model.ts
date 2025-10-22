import mongoose, { Schema, Types } from 'mongoose';
import { TPurchaseOrder } from './purchaseorder.interface';

const purchaseOrderProductSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productUnit: { type: String },
    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    subtotal: { type: Number },
    batchNumber: { type: String },
  },
  { _id: false }
);

export const purchaseOrderSchema = new Schema<TPurchaseOrder>(
  {
    orderDate: { type: String, required: true },
    expectedDeliveryDate: { type: String },
    receiveDate: { type: String },
    referenceNo: { type: Number, required: true },
   suppliers: [{ type: Schema.Types.ObjectId, ref: 'Supplier', required: true }],

    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Cancelled', 'Shipped','Received'],
      default: 'Pending',
    },
    products: {
      type: [purchaseOrderProductSchema],
      required: true,
    },
    
    shipping: { type: Number },
    grandTotal: { type: Number },
    paymentMethod: { type: String },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Partial', 'Paid'],
      default: 'Unpaid',
    },
    attachDocument: { type: String },
    note: { type: String },
  },
  { timestamps: true }
);

export const PurchaseOrder = mongoose.model<TPurchaseOrder>(
  'PurchaseOrder',
  purchaseOrderSchema
);
