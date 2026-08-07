"use client";

import * as React from "react";
import { PlusIcon, RefreshCwIcon, PencilIcon, TrashIcon, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
  listRolesAction,
} from "@/app/actions/roles";

type Role = {
  id: string;
  name: string;
  description: string | null;
  isSuperRole: boolean;
  permissionCount: number;
  permissionNames: string[];
  staffCount: number;
};

type Permission = {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
};

const createRoleSchema = z.object({
  name: z.string().min(1, "Role name is required").max(120),
  description: z.string().max(255).optional(),
  permissionIds: z.array(z.string()).optional(),
});

const updateRoleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Role name is required").max(120),
  description: z.string().max(255).optional(),
  permissionIds: z.array(z.string()).optional(),
});

type CreateRoleFormData = z.infer<typeof createRoleSchema>;
type UpdateRoleFormData = z.infer<typeof updateRoleSchema>;

interface RolesListProps {
  initialRoles: Role[];
  allPermissions: Permission[];
  canManageRoles: boolean;
}

export function RolesList({
  initialRoles,
  allPermissions,
  canManageRoles,
}: RolesListProps) {
  const [roles, setRoles] = React.useState<Role[]>(initialRoles);
  const [loading, setLoading] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = React.useState<Role | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const createForm = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      description: "",
      permissionIds: [],
    },
  });

  const editForm = useForm<UpdateRoleFormData>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      id: "",
      name: "",
      description: "",
      permissionIds: [],
    },
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await listRolesAction();
      if (result.success && result.data) {
        setRoles(result.data.roles);
      }
    } catch (error) {
      toast.error("Failed to refresh roles");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = async (data: CreateRoleFormData) => {
    setSubmitting(true);
    try {
      const result = await createRoleAction({
        name: data.name,
        description: data.description,
        isSuperRole: false,
        permissionIds: data.permissionIds,
      });

      if (result.success) {
        toast.success("Role created successfully");
        setCreateOpen(false);
        createForm.reset();
        await refresh();
      } else {
        toast.error(result.error || "Failed to create role");
      }
    } catch (error) {
      toast.error("Failed to create role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (data: UpdateRoleFormData) => {
    setSubmitting(true);
    try {
      const result = await updateRoleAction({
        id: data.id,
        name: data.name,
        description: data.description,
        permissionIds: data.permissionIds,
      });

      if (result.success) {
        toast.success("Role updated successfully");
        setEditingRole(null);
        editForm.reset();
        await refresh();
      } else {
        toast.error(result.error || "Failed to update role");
      }
    } catch (error) {
      toast.error("Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;

    setSubmitting(true);
    try {
      const result = await deleteRoleAction({ id: deletingRole.id });

      if (result.success) {
        toast.success("Role deleted successfully");
        setDeletingRole(null);
        await refresh();
      } else {
        toast.error(result.error || "Failed to delete role");
      }
    } catch (error) {
      toast.error("Failed to delete role");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    editForm.reset({
      id: role.id,
      name: role.name,
      description: role.description || "",
      permissionIds: [],
    });
  };

  if (!canManageRoles) {
    return null;
  }

  return (
    <>
      <Card className="mx-4 lg:mx-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheckIcon className="size-5" />
              Roles
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Define roles and assign permissions to them.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCwIcon className={loading ? "size-4 animate-spin" : "size-4"} />
              <span className="hidden lg:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Create role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
              <ShieldCheckIcon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No roles defined yet.
              </p>
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                Create your first role
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr className="border-b">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Permissions</th>
                    <th className="px-3 py-2 font-medium">Staff</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{role.name}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {role.description || "-"}
                      </td>
                      <td className="px-3 py-2">
                        {role.isSuperRole ? (
                          <Badge variant="default" className="bg-primary">
                            Super Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Standard</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {role.isSuperRole ? (
                          <span className="text-muted-foreground">All</span>
                        ) : (
                          <span>{role.permissionCount} permissions</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {role.staffCount > 0 ? (
                          <Badge variant="outline">{role.staffCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {role.name !== "super_admin" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(role)}
                              >
                                <PencilIcon className="size-4" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingRole(role)}
                                disabled={role.staffCount > 0}
                                className="text-destructive hover:text-destructive"
                              >
                                <TrashIcon className="size-4" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                placeholder="e.g., manager, front_desk"
                {...createForm.register("name")}
              />
              {createForm.formState.errors.name && (
                <p className="text-sm font-medium text-destructive">
                  {createForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what this role is for..."
                {...createForm.register("description")}
              />
            </div>
            <PermissionsCheckboxGroup
              permissions={allPermissions}
              selectedIds={createForm.watch("permissionIds") || []}
              onChange={(ids) => createForm.setValue("permissionIds", ids)}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Role Name</Label>
              <Input
                id="edit-name"
                {...editForm.register("name")}
              />
              {editForm.formState.errors.name && (
                <p className="text-sm font-medium text-destructive">
                  {editForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                {...editForm.register("description")}
              />
            </div>
            <PermissionsCheckboxGroup
              permissions={allPermissions}
              selectedIds={editForm.watch("permissionIds") || []}
              onChange={(ids) => editForm.setValue("permissionIds", ids)}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingRole(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog open={!!deletingRole} onOpenChange={(open) => !open && setDeletingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the role "{deletingRole?.name}"? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingRole(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Permissions Checkbox Group Component
function PermissionsCheckboxGroup({
  permissions,
  selectedIds,
  onChange,
}: {
  permissions: Permission[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  // Group permissions by resource
  const groupedPermissions = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  const togglePermission = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((pid) => pid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleAllInResource = (resource: string, allPermissions: Permission[]) => {
    const resourceIds = allPermissions.map((p) => p.id);
    const allSelected = resourceIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      onChange(selectedIds.filter((id) => !resourceIds.includes(id)));
    } else {
      onChange([...new Set([...selectedIds, ...resourceIds])]);
    }
  };

  const isAllSelectedInResource = (resource: string, allPermissions: Permission[]) => {
    const resourceIds = allPermissions.map((p) => p.id);
    return resourceIds.every((id) => selectedIds.includes(id));
  };

  return (
    <div className="space-y-4 rounded-md border p-4 max-h-80 overflow-y-auto">
      <Label>Permissions</Label>
      {Object.entries(groupedPermissions).map(([resource, perms]) => (
        <div key={resource}>
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              id={`resource-${resource}`}
              checked={isAllSelectedInResource(resource, perms)}
              onCheckedChange={() => toggleAllInResource(resource, perms)}
            />
            <label
              htmlFor={`resource-${resource}`}
              className="text-sm font-medium cursor-pointer"
            >
              {resource}
            </label>
          </div>
          <div className="ml-6 space-y-2">
            {perms.map((perm) => (
              <div key={perm.id} className="flex items-center gap-2">
                <Checkbox
                  id={perm.id}
                  checked={selectedIds.includes(perm.id)}
                  onCheckedChange={() => togglePermission(perm.id)}
                />
                <label
                  htmlFor={perm.id}
                  className="text-sm cursor-pointer flex-1"
                >
                  <span className="font-mono text-xs bg-muted px-1 rounded">
                    {perm.name}
                  </span>
                  {perm.description && (
                    <span className="ml-2 text-muted-foreground">
                      {perm.description}
                    </span>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
