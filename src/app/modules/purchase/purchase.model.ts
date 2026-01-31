import mongoose, { Schema, Types } from 'mongoose';
import { TPurchase } from './purchase.interface';

export const purchaseSchema: Schema<TPurchase> = new Schema<TPurchase>(
  {
    date: {
      type: Date,
    },
    referenceNo: {
      type: String,
    },
    warehouse: {
      type: Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    
    attachDocument: {
      type: String,
      required: false,
    },
    suppliers: [{ type: Schema.Types.ObjectId, ref: 'Supplier' }],
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },

    shipping: {
      type: Number,
    },
    note: {
      type: String,
    },
    paymentMethod: {
      type: String,
    },
    purchaseStatus: {
      type: String,
    },

    // 🔽 Newly added fields
    totalAmount: {
      type: Number,
      default: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    totalShipping: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },

    products: [
      {
        productId: {
          type: Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        productName: {
          type: String,
        },
        productUnit: {
          type: String,
        },
        discount: {
          type: Schema.Types.Mixed,
          default: 0,
        },
        productPrice: {
          type: Schema.Types.Mixed,
        },
        tax: {
          type: Schema.Types.Mixed,
          default: 0,
        },
        quantity: {
          type: Schema.Types.Mixed,
        },
        serialNumber: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

purchaseSchema.pre('save', function (next) {
  this.dueAmount = (this.grandTotal || 0) - (this.paidAmount || 0);
  next();
});

export const Purchase = mongoose.model<TPurchase>('Purchase', purchaseSchema);
