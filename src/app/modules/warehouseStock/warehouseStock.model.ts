import { Schema, model } from 'mongoose';
import { IWarehouseStock } from './warehouseStock.interface';

export const warehouseStockSchema = new Schema<IWarehouseStock>({
    warehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true,
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    quantity: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

warehouseStockSchema.index({ warehouse: 1, product: 1 }, { unique: true });

export const WarehouseStock = model('WarehouseStock', warehouseStockSchema);
