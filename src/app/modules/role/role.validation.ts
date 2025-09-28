// src/modules/role/role.validation.ts
import { z } from "zod";

// Permission Schema Validation
const permissionSchema = z.object({
  pageId: z.string({
    required_error: "Page ID is required",
  }),
  create: z.boolean().optional().default(false),
  edit: z.boolean().optional().default(false),
  view: z.boolean().optional().default(false),
  delete: z.boolean().optional().default(false),
});

// Role Schema Validation
export const createRoleValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Role name is required" })
      .trim()
      .min(1, "Role name cannot be empty"),
    type: z.enum(["admin", "manager", "employee", "user"], {
      required_error: "Role type is required",
    }),
    description: z.string().trim().optional(),
    createdBy: z.string({ required_error: "Created by is required" }),
    status: z.enum(["active", "inactive"]).optional().default("active"),
    permissions: z.array(permissionSchema).optional(),
  }),
});

// For updating role (partial fields allowed)
export const updateRoleValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    type: z.enum(["admin", "manager", "employee", "user"]).optional(),
    description: z.string().trim().optional(),
    createdBy: z.string().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    permissions: z.array(permissionSchema).optional(),
  }),
});
