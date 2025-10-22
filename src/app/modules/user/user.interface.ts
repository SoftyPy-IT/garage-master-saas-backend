// src/modules/user/user.interface.ts
import { Model, ObjectId } from 'mongoose';
import { USER_ROLE } from './user.constant';

export interface TUser {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  tenantDomain: string;
  tenantId?: ObjectId;
  roleId: ObjectId;
  pageId: ObjectId;
  permission: ObjectId;
  tenantInfo?: {
    name: string;
    domain: string;
    businessType?: string;
    dbUri: string;
    isActive: boolean;
    subscription?: {
      plan: string;
      startDate: Date;
      endDate: Date;
      status: string;
      isPaid: boolean;
      isActive: boolean;
      paymentMethod: string;
      amount: number;
    };
  };
  createdBy: string;
  status: 'active' | 'inactive';
  role: string;
  lastLogin?: Date;
  passwordChangeAt: Date;
  isDeleted?: boolean;
  image: string;
}

export interface UserModel extends Model<TUser> {
  isUserExistsByCustomId(name: string): Promise<TUser | null>;
  isPasswordMatched(
    plaingTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number,
  ): boolean;
}

export type TUserRole = keyof typeof USER_ROLE;