import { z } from "zod";

// ============================================
// PERMISSION SCHEMAS
// ============================================

export const createPermissionSchema = z.object({
  name: z
    .string()
    .min(1, "Permission name is required")
    .max(120, "Permission name is too long")
    .regex(
      /^[a-z_]+\.[a-z_]+$/,
      "Permission name must be in format 'resource.action' (e.g., 'admin.create')",
    ),
  description: z
    .string()
    .max(255, "Description is too long")
    .optional(),
  resource: z
    .string()
    .min(1, "Resource is required")
    .max(50, "Resource name is too long")
    .regex(
      /^[a-z_]+$/,
      "Resource must be lowercase letters and underscores only",
    ),
  action: z
    .string()
    .min(1, "Action is required")
    .max(50, "Action name is too long")
    .regex(
      /^[a-z_]+$/,
      "Action must be lowercase letters and underscores only",
    ),
});

export const updatePermissionSchema = z.object({
  id: z.string().min(1, "Permission ID is required"),
  name: z
    .string()
    .min(1, "Permission name is required")
    .max(120, "Permission name is too long")
    .regex(
      /^[a-z_]+\.[a-z_]+$/,
      "Permission name must be in format 'resource.action' (e.g., 'admin.create')",
    ),
  description: z
    .string()
    .max(255, "Description is too long")
    .optional(),
  resource: z
    .string()
    .min(1, "Resource is required")
    .max(50, "Resource name is too long")
    .regex(
      /^[a-z_]+$/,
      "Resource must be lowercase letters and underscores only",
    ),
  action: z
    .string()
    .min(1, "Action is required")
    .max(50, "Action name is too long")
    .regex(
      /^[a-z_]+$/,
      "Action must be lowercase letters and underscores only",
    ),
});

export const permissionIdSchema = z.object({
  id: z.string().min(1, "Permission ID is required"),
});

export const listPermissionsQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(120, "Search is too long")
    .optional(),
  resource: z
    .string()
    .trim()
    .max(50, "Resource filter is too long")
    .optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z
    .coerce.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(50),
});

// ============================================
// ROLE SCHEMAS
// ============================================

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(120, "Role name is too long")
    .regex(
      /^[a-z_]+$/,
      "Role name must be lowercase letters and underscores only",
    ),
  description: z
    .string()
    .max(255, "Description is too long")
    .optional(),
  isSuperRole: z.boolean().default(false),
  permissionIds: z
    .array(z.string().min(1, "Permission ID cannot be empty"))
    .optional(),
});

export const updateRoleSchema = z.object({
  id: z.string().min(1, "Role ID is required"),
  name: z
    .string()
    .min(1, "Role name is required")
    .max(120, "Role name is too long")
    .regex(
      /^[a-z_]+$/,
      "Role name must be lowercase letters and underscores only",
    ),
  description: z
    .string()
    .max(255, "Description is too long")
    .optional(),
  permissionIds: z
    .array(z.string().min(1, "Permission ID cannot be empty"))
    .optional(),
});

export const roleIdSchema = z.object({
  id: z.string().min(1, "Role ID is required"),
});

export const listRolesQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(120, "Search is too long")
    .optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z
    .coerce.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(50, "Limit cannot exceed 50")
    .default(20),
});

// ============================================
// STAFF-ROLE ASSIGNMENT SCHEMAS
// ============================================

export const assignRoleSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  roleId: z.string().min(1, "Role ID is required"),
});

export const removeRoleSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
export type PermissionIdInput = z.infer<typeof permissionIdSchema>;
export type ListPermissionsQuery = z.infer<typeof listPermissionsQuerySchema>;

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type RoleIdInput = z.infer<typeof roleIdSchema>;
export type ListRolesQuery = z.infer<typeof listRolesQuerySchema>;

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type RemoveRoleInput = z.infer<typeof removeRoleSchema>;
