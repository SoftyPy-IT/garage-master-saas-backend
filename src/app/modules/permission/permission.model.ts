// src/modules/permission/permission.model.ts
import { Schema, model } from 'mongoose';
import { IPermissionDocument, IPermissionModel } from './permission.interface';

const permissionSchema = new Schema<IPermissionDocument, IPermissionModel>(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role ID is required'],
    },
    pageId: {
      type: Schema.Types.ObjectId,
      ref: 'Page',
      required: [true, 'Page ID is required'],
    },
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
    toJSON: { virtuals: true },
  }
);

// Create a compound index for roleId and pageId to ensure uniqueness
permissionSchema.index({ roleId: 1, pageId: 1 }, { unique: true });

// Static method to find permission by page and role
permissionSchema.statics.findByPageAndRole = async function (
  pageId: string,
  roleId: string
): Promise<IPermissionDocument | null> {
  return this.findOne({ pageId, roleId });
};

// Static method to find all permissions for a role
permissionSchema.statics.findByRole = async function (
  roleId: string
): Promise<IPermissionDocument[]> {
  return this.find({ roleId }).populate('pageId');
};

// Static method to delete all permissions for a role
permissionSchema.statics.deleteByRole = async function (roleId: string): Promise<void> {
  await this.deleteMany({ roleId });
};

// Virtual to populate page information
permissionSchema.virtual('page', {
  ref: 'Page',
  localField: 'pageId',
  foreignField: '_id',
  justOne: true,
});

// Virtual to populate role information
permissionSchema.virtual('role', {
  ref: 'Role',
  localField: 'roleId',
  foreignField: '_id',
  justOne: true,
});

const Permission = model<IPermissionDocument, IPermissionModel>('Permission', permissionSchema);

export default Permission;