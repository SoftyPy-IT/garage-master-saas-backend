import { Schema, model, Types, Document } from 'mongoose';
import { IStockTransaction } from './stockTransaction.interface';

export const StockTransactionSchema = new Schema<IStockTransaction>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantity: { type: Number, required: true },
    batchNumber: { type: String },
    type: { type: String, enum: ['in', 'out'], required: true },
    referenceType: { type: String },
    referenceId: { type: Schema.Types.ObjectId },
    sellingPrice: { type: Number },
    date: { type: Date, default: Date.now },
  },
  {
    timestamps: true, 
  }
);

export const StockTransaction = model<IStockTransaction>('StockTransaction', StockTransactionSchema);
