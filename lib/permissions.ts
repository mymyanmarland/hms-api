import prisma from "@/lib/prisma";
import type { Staff, User, Role, Permission } from "@/app/generated/prisma/client";

export type AdminActorWithRole = {
  user: User;
  staff: Staff & {
    adminRole: Role | null;
  };
};

/**
 * Get all permissions for a staff member.
 * If the staff has a Super Admin role, all permissions are returned.
 * Otherwise, only the permissions assigned to their specific role are returned.
 */
export async function getUserPermissions(
  userId: string,
): Promise<Permission[]> {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    include: {
      adminRole: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!staff || !staff.adminRole) {
    return [];
  }

  // Super Admin has all permissions
  if (staff.adminRole.isSuperRole) {
    const allPermissions = await prisma.permission.findMany();
    return allPermissions;
  }

  // Return permissions assigned to the role
  return staff.adminRole.rolePermissions.map((rp) => rp.permission);
}

/**
 * Check if a user has a specific permission.
 * Returns true if the user has a Super Admin role OR the specific permission.
 */
export async function hasPermission(
  userId: string,
  permissionName: string,
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.some((p) => p.name === permissionName);
}

/**
 * Check if a user has ANY of the specified permissions.
 */
export async function hasAnyPermission(
  userId: string,
  permissionNames: string[],
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  const userPermissionNames = permissions.map((p) => p.name);
  return permissionNames.some((name) => userPermissionNames.includes(name));
}

/**
 * Check if a user has ALL of the specified permissions.
 */
export async function hasAllPermissions(
  userId: string,
  permissionNames: string[],
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  const userPermissionNames = permissions.map((p) => p.name);
  return permissionNames.every((name) => userPermissionNames.includes(name));
}

/**
 * Check if a user has the Super Admin role.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    include: {
      adminRole: true,
    },
  });

  return staff?.adminRole?.isSuperRole ?? false;
}

/**
 * Get the admin role for a staff member.
 */
export async function getStaffRole(staffId: string): Promise<Role | null> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      adminRole: true,
    },
  });

  return staff?.adminRole ?? null;
}

/**
 * Get the admin role for a user.
 */
export async function getUserRole(userId: string): Promise<Role | null> {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    include: {
      adminRole: true,
    },
  });

  return staff?.adminRole ?? null;
}

/**
 * Custom error class for permission denied.
 */
export class PermissionDeniedError extends Error {
  constructor(
    message = "You do not have permission to perform this action",
    public requiredPermission?: string,
  ) {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

/**
 * Require a specific permission, throwing if denied.
 * Use this in server actions to check permissions before performing operations.
 */
export async function requirePermission(
  userId: string,
  permissionName: string,
): Promise<void> {
  const hasIt = await hasPermission(userId, permissionName);
  if (!hasIt) {
    throw new PermissionDeniedError(
      `Permission '${permissionName}' is required`,
      permissionName,
    );
  }
}

/**
 * Require ANY of the specified permissions, throwing if denied.
 */
export async function requireAnyPermission(
  userId: string,
  permissionNames: string[],
): Promise<void> {
  const hasAny = await hasAnyPermission(userId, permissionNames);
  if (!hasAny) {
    throw new PermissionDeniedError(
      `One of the following permissions is required: ${permissionNames.join(", ")}`,
      permissionNames.join(", "),
    );
  }
}

/**
 * Require ALL of the specified permissions, throwing if denied.
 */
export async function requireAllPermissions(
  userId: string,
  permissionNames: string[],
): Promise<void> {
  const hasAll = await hasAllPermissions(userId, permissionNames);
  if (!hasAll) {
    throw new PermissionDeniedError(
      `The following permissions are required: ${permissionNames.join(", ")}`,
      permissionNames.join(", "),
    );
  }
}

/**
 * Require Super Admin role, throwing if the user is not a Super Admin.
 */
export async function requireSuperAdmin(userId: string): Promise<void> {
  const isSuper = await isSuperAdmin(userId);
  if (!isSuper) {
    throw new PermissionDeniedError(
      "Super Admin access is required",
      "super_admin",
    );
  }
}
