// src/modules/permission/permission.model.ts
import { Schema, model } from 'mongoose';
import { IPermission } from './permission.interface';

export const permissionSchema = new Schema<IPermission>(
  {
   userId: [{
  type: Schema.Types.ObjectId,
  ref: 'User',
}],
roleId: [{
  type: Schema.Types.ObjectId,
  ref: 'Role',
  required: true,
}],
pageId: [{
  type: Schema.Types.ObjectId,
  ref: 'Page',
  required: true,
}],
    create: {
      type: Boolean,
      default: false,
    },
    edit: {
      type: Boolean,
      default: false,
    },
    view: {
      type: Boolean,
      default: false,
    },
    delete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Permission = model<IPermission>('Permission', permissionSchema);