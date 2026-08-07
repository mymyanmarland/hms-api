"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdminOrThrow, AdminForbiddenError } from "@/lib/admin-auth";
import {
  hasPermission,
  hasAnyPermission,
  requirePermission,
  PermissionDeniedError,
} from "@/lib/permissions";
import {
  createPermissionSchema,
  updatePermissionSchema,
  permissionIdSchema,
  listPermissionsQuerySchema,
  createRoleSchema,
  updateRoleSchema,
  roleIdSchema,
  listRolesQuerySchema,
  assignRoleSchema,
  removeRoleSchema,
  type CreatePermissionInput,
  type UpdatePermissionInput,
  type ListPermissionsQuery,
  type CreateRoleInput,
  type UpdateRoleInput,
  type ListRolesQuery,
  type AssignRoleInput,
} from "@/lib/validations/roles";
import type { ActionResponse } from "@/app/actions/password-reset";

function flattenZodErrors(
  errors: Record<string, string[] | undefined>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (value && value.length > 0) {
      result[key] = value;
    }
  }
  return result;
}

// ============================================
// PERMISSION ACTIONS
// ============================================

/**
 * Create a new permission
 */
export async function createPermissionAction(
  input: CreatePermissionInput,
): Promise<ActionResponse> {
  const parsed = createPermissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Admin access required." };
  }

  try {
    await requirePermission(actor.user.id, "permission.create");
  } catch {
    return { success: false, error: "You do not have permission to create permissions." };
  }

  const { name, description, resource, action } = parsed.data;

  try {
    // Check if permission already exists
    const existing = await prisma.permission.findUnique({
      where: { name },
    });

    if (existing) {
      return {
        success: false,
        fieldErrors: { name: ["A permission with this name already exists."] },
      };
    }

    const permission = await prisma.permission.create({
      data: {
        name,
        description: description ?? null,
        resource,
        action,
      },
    });

    revalidatePath("/dashboard/roles");
    return { success: true };
  } catch (error) {
    console.error("Create permission error:", error);
    return {
      success: false,
      error: "Failed to create permission. Please try again.",
    };
  }
}

/**
 * Update an existing permission
 */
export async function updatePermissionAction(
  input: UpdatePermissionInput,
): Promise<ActionResponse> {
  const parsed = updatePermissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Admin access required." };
  }

  try {
    await requirePermission(actor.user.id, "permission.update");
  } catch {
    return { success: false, error: "You do not have permission to update permissions." };
  }

  const { id, name, description, resource, action } = parsed.data;

  try {
    const existing = await prisma.permission.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Permission not found." };
    }

    // Check if new name conflicts with another permission
    if (name !== existing.name) {
      const conflict = await prisma.permission.findFirst({
        where: { name, NOT: { id } },
      });
      if (conflict) {
        return {
          success: false,
          fieldErrors: { name: ["Another permission already uses this name."] },
        };
      }
    }

    await prisma.permission.update({
      where: { id },
      data: {
        name,
        description: description ?? null,
        resource,
        action,
      },
    });

    revalidatePath("/dashboard/roles");
    return { success: true };
  } catch (error) {
    console.error("Update permission error:", error);
    return {
      success: false,
      error: "Failed to update permission. Please try again.",
    };
  }
}

/**
 * Delete a permission
 */
export async function deletePermissionAction(
  input: { id: string },
): Promise<ActionResponse> {
  const parsed = permissionIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Admin access required." };
  }

  try {
    await requirePermission(actor.user.id, "permission.delete");
  } catch {
    return { success: false, error: "You do not have permission to delete permissions." };
  }

  const { id } = parsed.data;

  try {
    const existing = await prisma.permission.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Permission not found." };
    }

    await prisma.permission.delete({
      where: { id },
    });

    revalidatePath("/dashboard/roles");
    return { success: true };
  } catch (error) {
    console.error("Delete permission error:", error);
    return {
      success: false,
      error: "Failed to delete permission. Please try again.",
    };
  }
}

/**
 * List all permissions with optional filtering
 */
export async function listPermissionsAction(
  input?: ListPermissionsQuery,
): Promise<ActionResponse<{ permissions: any[]; nextCursor?: string }>> {
  let actor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Admin access required." };
  }

  try {
    await requirePermission(actor.user.id, "permission.read");
  } catch {
    return { success: false, error: "You do not have permission to view permissions." };
  }

  const parsed = listPermissionsQuerySchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { search, resource, cursor, limit } = parsed.data;

  try {
    const permissions = await prisma.permission.findMany({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }),
        ...(resource && { resource }),
      },
      orderBy: [{ resource: "asc" }, { action: "asc" }],
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    let nextCursor: string | undefined;
    if (permissions.length > limit) {
      const next = permissions.pop();
      nextCursor = next?.id;
    }

    return { success: true, data: { permissions, nextCursor } };
  } catch (error) {
    console.error("List permissions error:", error);
    return {
      success: false,
      error: "Failed to list permissions. Please try again.",
    };
  }
}

// ============================================
// ROLE ACTIONS
// ============================================

/**
 * Create a new role
 */
export async function createRoleAction(
  input: CreateRoleInput,
): Promise<ActionResponse> {
  const parsed = createRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Admin access required." };
  }

  try {
    await requirePermission(actor.user.id, "role.create");
  } catch {
    return { success: false, error: "You do not have permission to create roles." };
  }

  const { name, description, isSuperRole, permissionIds } = parsed.data;

  // Super roles can only be created by super admins
  if (isSuperRole) {
    try {
      const { requireSuperAdmin } = await import("@/lib/permissions");
      await requireSuperAdmin(actor.user.id);
    } catch {
      return { success: false, error: "Only Super Admins can create Super Admin roles." };
    }
  }

  try {
    // Check if role already exists
    const existing = await prisma.role.findUnique({
      where: { name },
    });

    if (existing) {
      return {
        success: false,
        fieldErrors: { name: ["A role with this name already exists."] },
      };
    }

    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name,
          description: description ?? null,
          isSuperRole: isSuperRole ?? false,
        },
      });

      // Assign permissions to the role (if provided and not a super role)
      if (!isSuperRole && permissionIds && permissionIds.length > 0) {
        const permissionConnections = permissionIds.map((permId) => ({
          roleId: created.id,
          permissionId: permId,
        }));

        await tx.rolePermission.createMany({
          data: permissionConnections,
        });
      }

      return created;
    });

    revalidatePath("/dashboard/roles");
    return { success: true };
  } catch (error) {
    console.error("Create role error:", error);
    return {
      success: false,
      error: "Failed to create role. Please try again.",
    };
  }
}

/**
 * Update an existing role
 */
export async function updateRoleAction(
  input: UpdateRoleInput,
): Promise<ActionResponse> {
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Admin access required." };
  }

  try {
    await requirePermission(actor.user.id, "role.update");
  } catch {
    return { success: false, error: "You do not have permission to update roles." };
  }

  const { id, name, description, permissionIds } = parsed.data;

  try {
    const existing = await prisma.role.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Role not found." };
    }

    // Cannot modify super_admin role
    if (existing.name === "super_admin") {
      return { success: false, error: "Cannot modify the Super Admin role." };
    }

    // Check if new name conflicts with another role
    if (name !== existing.name) {
      const conflict = await prisma.role.findFirst({
        where: { name, NOT: { id } },
      });
      if (conflict) {
        return {
          success: false,
          fieldErrors: { name: ["Another role already uses this name."] },
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          name,
          description: description ?? null,
        },
      });

      // Update permissions if provided
      if (permissionIds !== undefined) {
        // Delete existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        // Add new permissions
        if (permissionIds.length > 0) {
          const permissionConnections = permissionIds.map((permId) => ({
            roleId: id,
            permissionId: permId,
          }));

          await tx.rolePermission.createMany({
            data: permissionConnections,
          });
        }
      }
    });

    revalidatePath("/dashboard/roles");
    return { success: true };
  } catch (error) {
    console.error("Update role error:", error);
    return {
      success: false,
      error: "Failed to update role. Please try again.",
    };
  }
}

/**
 * Delete a role
 */
export async function deleteRoleAction(
  input: { id: string },
): Promise<ActionResponse> {
  const parsed = roleIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Admin access required." };
  }

  try {
    await requirePermission(actor.user.id, "role.delete");
  } catch {
    return { success: false, error: "You do not have permission to delete roles." };
  }

  const { id } = parsed.data;

  try {
    const existing = await prisma.role.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Role not found." };
    }

    // Cannot delete super_admin role
    if (existing.name === "super_admin") {
      return { success: false, error: "Cannot delete the Super Admin role." };
    }

    // Check if any staff are assigned to this role
    const staffWithRole = await prisma.staff.count({
      where: { adminRoleId: id },
    });

    if (staffWithRole > 0) {
      return {
        success: false,
        error: `Cannot delete this role. ${staffWithRole} staff member(s) are assigned to it.`,
      };
    }

    await prisma.role.delete({
      where: { id },
    });

    revalidatePath("/dashboard/roles");
    return { success: true };
  } catch (error) {
    console.error("Delete role error:", error);
    return {
      success: false,
      error: "Failed to delete role. Please try again.",
    };
  }
}

/**
 * List all roles with optional filtering
 */
export async function listRolesAction(
  input?: ListRolesQuery,
): Promise<ActionResponse<{ roles: any[]; nextCursor?: string }>> {
  let actor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Admin access required." };
  }

  try {
    await requirePermission(actor.user.id, "role.read");
  } catch {
    return { success: false, error: "You do not have permission to view roles." };
  }

  const parsed = listRolesQuerySchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { search, cursor, limit } = parsed.data;

  try {
    const roles = await prisma.role.findMany({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { staff: true },
        },
      },
      orderBy: { name: "asc" },
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    let nextCursor: string | undefined;
    if (roles.length > limit) {
      const next = roles.pop();
      nextCursor = next?.id;
    }

    // Transform roles to include permission count and names
    const transformedRoles = roles.map((role) => ({
      ...role,
      permissionCount: role.rolePermissions.length,
      permissionNames: role.rolePermissions.map((rp) => rp.permission.name),
      staffCount: role._count.staff,
      rolePermissions: undefined,
      _count: undefined,
    }));

    return { success: true, data: { roles: transformedRoles, nextCursor } };
  } catch (error) {
    console.error("List roles error:", error);
    return {
      success: false,
      error: "Failed to list roles. Please try again.",
    };
  }
}

// ============================================
// STAFF-ROLE ASSIGNMENT ACTIONS
// ============================================

/**
 * Assign a role to a staff member
 */
export async function assignRoleToStaffAction(
  input: AssignRoleInput,
): Promise<ActionResponse> {
  const parsed = assignRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Admin access required." };
  }

  try {
    await requirePermission(actor.user.id, "admin.assign_role");
  } catch {
    return { success: false, error: "You do not have permission to assign roles." };
  }

  const { staffId, roleId } = parsed.data;

  try {
    // Verify staff exists and is an admin
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff || staff.role !== "ADMIN") {
      return { success: false, error: "Admin staff member not found." };
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return { success: false, error: "Role not found." };
    }

    // Assign the role
    await prisma.staff.update({
      where: { id: staffId },
      data: { adminRoleId: roleId },
    });

    revalidatePath("/dashboard/admins");
    revalidatePath("/dashboard/roles");
    return { success: true };
  } catch (error) {
    console.error("Assign role error:", error);
    return {
      success: false,
      error: "Failed to assign role. Please try again.",
    };
  }
}

/**
 * Remove a role from a staff member
 */
export async function removeRoleFromStaffAction(
  input: { staffId: string },
): Promise<ActionResponse> {
  const parsed = removeRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Admin access required." };
  }

  try {
    await requirePermission(actor.user.id, "admin.assign_role");
  } catch {
    return { success: false, error: "You do not have permission to remove roles." };
  }

  const { staffId } = parsed.data;

  // Prevent removing own role
  if (staffId === actor.staff.id) {
    return { success: false, error: "You cannot remove your own role." };
  }

  try {
    // Verify staff exists and is an admin
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff || staff.role !== "ADMIN") {
      return { success: false, error: "Admin staff member not found." };
    }

    // Remove the role
    await prisma.staff.update({
      where: { id: staffId },
      data: { adminRoleId: null },
    });

    revalidatePath("/dashboard/admins");
    revalidatePath("/dashboard/roles");
    return { success: true };
  } catch (error) {
    console.error("Remove role error:", error);
    return {
      success: false,
      error: "Failed to remove role. Please try again.",
    };
  }
}

/**
 * Get available roles for assignment (excludes super_admin unless actor is super admin)
 */
export async function getAssignableRolesAction(): Promise<
  ActionResponse<{ roles: any[] }>
> {
  let actor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Admin access required." };
  }

  try {
    const { isSuperAdmin } = await import("@/lib/permissions");
    const actorIsSuper = await isSuperAdmin(actor.user.id);

    const roles = await prisma.role.findMany({
      where: actorIsSuper ? {} : { name: { not: "super_admin" } },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const transformedRoles = roles.map((role) => ({
      ...role,
      permissionCount: role.rolePermissions.length,
      rolePermissions: undefined,
    }));

    return { success: true, data: { roles: transformedRoles } };
  } catch (error) {
    console.error("Get assignable roles error:", error);
    return {
      success: false,
      error: "Failed to get roles. Please try again.",
    };
  }
}

// Re-export types
export type { ActionResponse } from "@/app/actions/password-reset";
