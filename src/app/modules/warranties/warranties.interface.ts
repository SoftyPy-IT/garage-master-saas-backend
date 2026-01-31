import { ObjectId } from "mongoose";

export type TWarranty = {
  _id?: string;
  name: string;
  description?: string;
  duration: number;
  durationType: 'days' | 'months' | 'years';
  terms?: string;
  tenantDomain?: string;
    products: ObjectId;
};
