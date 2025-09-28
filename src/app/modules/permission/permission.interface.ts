// src/modules/permission/permission.interface.ts
import { Document, Model, Types } from 'mongoose';
import { IPage } from '../page/page.interface';

export interface IPermission {
  roleId: Types.ObjectId;
  pageId: Types.ObjectId;
  create: boolean;
  edit: boolean;
  view: boolean;
  delete: boolean;
}

export interface IPermissionWithPage extends IPermission {
  page?: IPage;
}

export interface IPermissionModel extends Model<IPermissionDocument> {
  findByPageAndRole(pageId: string, roleId: string): Promise<IPermissionDocument | null>;
  findByRole(roleId: string): Promise<IPermissionDocument[]>;
  deleteByRole(roleId: string): Promise<void>;
}

export interface IPermissionDocument extends IPermission, Document {
  page?: IPage;
}

export interface IPermissionCheck {
  userId: string;
  pageId: string;
  action: 'create' | 'edit' | 'view' | 'delete';
}

export interface IPermissionMatrix {
  [pageId: string]: {
    create: boolean;
    edit: boolean;
    view: boolean;
    delete: boolean;
  };
}

export interface IUserPermissions {
  userId: string;
  roleId: string;
  roleName: string;
  roleType: string;
  permissions: IPermissionMatrix;
}

export interface IPermissionRequest {
  pageId: string;
  create: boolean;
  edit: boolean;
  view: boolean;
  delete: boolean;
}