import { redirect } from "next/navigation";
import { ShieldCheckIcon } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getSidebarUserData, requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { RolesList } from "./_components/roles-list";
import { PermissionsList } from "./_components/permissions-list";

export default async function RolesPage() {
  const actor = await requireAdmin();
  const userData = await getSidebarUserData();
  if (!actor || !userData) {
    redirect("/login");
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
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" userData={userData} />
      <SidebarInset>
        <SiteHeader pageTitle="Roles & Permissions" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex flex-col gap-6">
                <div className="px-4 lg:px-6">
                  <div className="flex flex-col gap-3 pt-2">
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
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
