
import { ObjectId } from "mongoose";
export interface IRole {
  name: string;
  type: "admin" | "manager" | "employee" | "user" | 'technician' | 'front-desk' | 'accountant' | 'warehouse' | 'superadmin';
  description?: string;
  createdBy: string;
  status: "active" | "inactive";
  permissions?: ObjectId[];
}
