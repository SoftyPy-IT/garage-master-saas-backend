// src/modules/role/role.validation.ts
import { z } from "zod";


export const createRoleValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Role name is required" })
      .trim()
      .min(1, "Role name cannot be empty"),
    type: z.enum([
      'admin',
      'manager',
      'technician',
      'front-desk',
      'accountant',
      'warehouse',
      'user',
    ], {
      required_error: "Role type is required",
    }),
    description: z.string().trim().optional(),
    createdBy: z.string(),
    status: z.enum(["active", "inactive"]).optional().default("active"),

  }),
});


export const updateRoleValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    type: z.enum(["admin", "manager", "employee", "user"]).optional(),
    description: z.string().trim().optional(),
    createdBy: z.string().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  }),
});
