// src/modules/role/role.model.ts
import { Schema, Types, model } from 'mongoose';
import { IRole } from './role.interface';

export const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
    },
    type: {
      type: String,
      enum: ['admin', 'manager', 'employee', 'user'],
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    permissions: {
      type: Types.ObjectId,
      ref: 'Permission',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  },
);

const Role = model<IRole>('Role', roleSchema);

export default Role;
