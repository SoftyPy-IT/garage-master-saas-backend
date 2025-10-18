
import { ObjectId } from "mongoose";
export interface IRole {
  name: string;
  type: "admin" | "manager" | "employee" | "user";
  description?: string;
  createdBy: string;
  status: "active" | "inactive";
  permissions?: ObjectId[];
}