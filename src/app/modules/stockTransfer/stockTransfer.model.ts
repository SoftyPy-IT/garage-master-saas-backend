// stockTransfer.model.ts
import { Schema, model, models } from 'mongoose';
import { IStockTransfer } from './stockTransfer.interface';

export const stockTransferSchema = new Schema<IStockTransfer>({
  // Add these required fields
  product: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  
  // Existing fields
  fromWarehouse: { 
    type: Schema.Types.ObjectId, 
    ref: 'Warehouse', 
    required: true 
  },
  toWarehouse: { 
    type: Schema.Types.ObjectId, 
    ref: 'Warehouse', 
    required: true 
  },
  transferId: { 
    type: String, 
    required: true 
  },
  batchNumber: { 
    type: String 
  },
  expiryDate: { 
    type: Date 
  },
  note: { 
    type: String 
  },
  transferredBy: { 
    type: String,
    required: true
  },
  date: { 
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'transit'],
    default: 'pending',
    required: true,
  },
}, {
  timestamps: true, 
});

const StockTransfer = models.StockTransfer || model<IStockTransfer>('StockTransfer', stockTransferSchema);
export default StockTransfer;