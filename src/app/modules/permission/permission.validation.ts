import { z } from 'zod';

export const permissionRequestSchema = z.object({
  body: z.object({
    roleId: z.array(z.string({
      required_error: 'Role ID is required',
    })),
    pageId: z.array(z.string({
      required_error: 'Page ID is required',
    })),
    userId: z.array(z.string({
      required_error: 'User ID is required',
    })),
    create: z.boolean().optional(),
    edit: z.boolean().optional(),
    view: z.boolean().optional(),
    delete: z.boolean().optional(),
  }),
});

export const batchCreatePermissionSchema = z.object({
  body: z.object({
    permissionData: z.array(
      z.object({
        userId: z.string({ required_error: "User ID is required" }),
        pageId: z.string({ required_error: "Page ID is required" }),
        roleId: z.string().optional(),
        create: z.boolean().optional().default(false),
        edit: z.boolean().optional().default(false),
        view: z.boolean().optional().default(false),
        delete: z.boolean().optional().default(false),
      })
    ).min(1, "At least one permission is required")
  })
});


export const checkPermissionZodSchema = z.object({
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
});
export const deleteMultiplePermissionsSchema = z.object({
  body: z.object({
    permissionIds: z.array(z.string({
      required_error: 'Permission IDs are required',
      invalid_type_error: 'Permission IDs must be strings',
    })).refine(ids => {
      // Check if all IDs are valid ObjectIds and not "batch"
      return ids.every(id => id !== 'batch' && /^[0-9a-fA-F]{24}$/.test(id));
    }, {
      message: 'All permission IDs must be valid MongoDB ObjectIds',
    }),
  }),
});