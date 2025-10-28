import { Types } from 'mongoose';

export interface IWarehouseStock {
    warehouse: Types.ObjectId;
    product: Types.ObjectId;
    quantity: number;
    createdAt?: Date;
    updatedAt?: Date;
}
