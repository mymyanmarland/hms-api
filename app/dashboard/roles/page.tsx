import * as React from "react";
import { ShieldCheckIcon, KeyIcon } from "lucide-react";
import { requireAdminOrThrow } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { RolesList } from "./_components/roles-list";
import { PermissionsList } from "./_components/permissions-list";

export default async function RolesPage() {
  // Server-side auth check
  let actor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need admin access to view this page.</p>
        </div>
      </div>
    );
  }

  // Server-side permission checks
  const canReadRoles = await hasPermission(actor.user.id, "role.read");
  const canReadPermissions = await hasPermission(actor.user.id, "permission.read");

  // Fetch roles with their permissions and staff count
  const roles = canReadRoles
    ? await prisma.role.findMany({
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
      })
    : [];

  // Fetch all permissions grouped by resource
  const permissions = canReadPermissions
    ? await prisma.permission.findMany({
        orderBy: [{ resource: "asc" }, { action: "asc" }],
      })
    : [];

  // Transform roles for the client
  const transformedRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isSuperRole: role.isSuperRole,
    permissionCount: role.rolePermissions.length,
    permissionNames: role.rolePermissions.map((rp) => rp.permission.name),
    staffCount: role._count.staff,
  }));

  // Group permissions by resource
  const permissionsByResource = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    },
    {} as Record<string, typeof permissions>,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-3 pt-2">
          <BackButton href="/dashboard" label="Back to Dashboard" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheckIcon className="size-6" />
              Roles & Permissions
            </h1>
            <p className="text-muted-foreground">
              Manage roles and their associated permissions for admin access control.
            </p>
          </div>
        </div>
      </div>

      <RolesList
        initialRoles={transformedRoles}
        allPermissions={permissions}
        canManageRoles={canReadRoles}
      />

      <PermissionsList
        permissionsByResource={permissionsByResource}
        canManagePermissions={canReadPermissions}
      />
    </div>
  );
}
