import mongoose, { Schema } from 'mongoose';
import { IWarehouse } from './warehouse.interface';

export const warehouseSchema = new Schema<IWarehouse>(
  {
    warehouseId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    manager: { type: String },
    phone: { type: String },
    type: { type: String },
    capacity: { type: Number },
    openingDate: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    note: { type: String },
  },
  { timestamps: true },
);

const Warehouse = mongoose.model<IWarehouse>('Warehouse', warehouseSchema);

export default Warehouse;
