// src/modules/role/role.interface.ts
import { Document, Model, Types } from 'mongoose';
import { IPage } from '../page/page.interface';

export interface IPermission {
  pageId: Types.ObjectId;
  create: boolean;
  edit: boolean;
  view: boolean;
  delete: boolean;
}

export interface IPermissionWithPage extends IPermission {
  page?: IPage;
}

export interface IPermissionCount {
  create: number;
  edit: number;
  view: number;
  delete: number;
  total: number;
}

export interface IRole {
  name: string;
  type: 'admin' | 'manager' | 'employee' | 'user';
  description?: string;
  createdBy: string;
  status: 'active' | 'inactive';
  permissions: IPermission[];
}

export interface IRoleMethods {
  // Add any instance methods here
}

export interface IRoleModel extends Model<IRole, {}, IRoleMethods> {
  isRoleExistsByName(name: string): Promise<IRoleDocument | null>;
}

export interface IRoleDocument extends IRole, Document, IRoleMethods {
  permissionCount?: IPermissionCount;
}

export interface IRoleFilters {
  searchTerm?: string;
  type?: string;
  status?: string;
  [key: string]: any;
}