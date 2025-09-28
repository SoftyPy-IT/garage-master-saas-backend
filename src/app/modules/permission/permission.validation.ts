import { z } from 'zod';

const checkPermissionZodSchema = {
  body: z.object({
    userId: z.string({
      required_error: 'User ID is required',
    }),
    pageId: z.string({
      required_error: 'Page ID is required',
    }),
    action: z.enum(['create', 'edit', 'view', 'delete'], {
      required_error: 'Action is required',
    }),
  }),
};

const permissionRequestSchema = z.object({
  pageId: z.string({
    required_error: 'Page ID is required',
  }),
  create: z.boolean().default(false),
  edit: z.boolean().default(false),
  view: z.boolean().default(false),
  delete: z.boolean().default(false),
});

const updateRolePermissionsZodSchema = {
  body: z.array(permissionRequestSchema),
  params: z.object({
    roleId: z.string({
      required_error: 'Role ID is required',
    }),
  }),
};

export const PermissionValidation = {
  checkPermissionZodSchema,
  updateRolePermissionsZodSchema,
};