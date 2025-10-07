// src/modules/permission/permission.interface.ts
import { Document, Types } from 'mongoose';

export interface IPermission {
  _id?: Types.ObjectId;
  userId: Types.ObjectId[];
  roleId: Types.ObjectId[];
  pageId: Types.ObjectId[];
  create: boolean;
  edit: boolean;
  view: boolean;
  delete: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}



export interface IPermissionRequest {
  roleId: string;
  pageId: string;
  create?: boolean;
  edit?: boolean;
  view?: boolean;
  delete?: boolean;
}

export interface IPermissionCheck {
  userId: string;
  pageId: string;
  action: 'create' | 'edit' | 'view' | 'delete';
}