import mongoose, { Schema } from 'mongoose';
import { ITenant } from './tenant.interface';
import { subscriptionSchema } from '../subscription/subscription.model';

export const tenantSchema = new Schema<ITenant>({
  name: { type: String, required: true },
  domain: { type: String, required: true, unique: true },
  businessType: { type: String },
  dbUri: { type: String, required: true },
  subscription: { type: subscriptionSchema, required: true },
  isActive: { type: Boolean, default: true },
});

export const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
