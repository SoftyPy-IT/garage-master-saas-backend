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
    }],
    pageId: [{
      type: Schema.Types.ObjectId,
      ref: 'Page',
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

permissionSchema.index({ userId: 1, pageId: 1 });
permissionSchema.index({ roleId: 1 });
permissionSchema.index({ createdAt: -1 });

export const Permission = model<IPermission>('Permission', permissionSchema);