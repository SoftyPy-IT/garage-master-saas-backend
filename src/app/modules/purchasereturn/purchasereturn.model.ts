import { Schema, model, Types } from 'mongoose';
import { TPurchaseReturn } from './purchasereturn.interface';

export const purchaseReturnSchema = new Schema<TPurchaseReturn>(
  {
    returnDate: {
      type: Date,
      required: true,
    },

    referenceNo: {
      type: String,
    },

    suppliers: [
      { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    ],

    warehouse: {
      type: Types.ObjectId,
      ref: 'Warehouse',
    },
    returnReason: {
      type: String,
    },
    returnNote: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
    items: [
      {
        productId: {
          type: Types.ObjectId,
          ref: 'Product',

        },
        productCode: {
          type: String,
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        maxQuantity: {
          type: Number,
        },
        unitPrice: {
          type: Number,
          required: true,
        },
        unit: {
          type: String,
          required: true,
        },
        totalAmount: {
          type: Number,
          required: true,
        },
      },
    ],
    totalReturnAmount: {
      type: Number,
      required: true,
    },
    approvedBy: {
      type: Types.ObjectId,
      ref: 'User',
    },
    approvedDate: {
      type: Date,
    },
  },
  { timestamps: true },
);

purchaseReturnSchema.pre('save', function (next) {
  this.totalReturnAmount = this.items.reduce(
    (sum, item) => sum + item.totalAmount,
    0,
  );
  next();
});

export const PurchaseReturn = model<TPurchaseReturn>(
  'PurchaseReturn',
  purchaseReturnSchema,
);
