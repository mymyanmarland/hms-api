"use client";

import * as React from "react";
import { KeyIcon, PlusIcon, RefreshCwIcon, PencilIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  createPermissionAction,
  updatePermissionAction,
  deletePermissionAction,
  listPermissionsAction,
} from "@/app/actions/roles";

type Permission = {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
};

const createPermissionSchema = z.object({
  name: z
    .string()
    .min(1, "Permission name is required")
    .regex(
      /^[a-z_]+\.[a-z_]+$/,
      "Must be in format 'resource.action' (e.g., 'admin.create')",
    ),
  description: z.string().max(255).optional(),
  resource: z
    .string()
    .min(1, "Resource is required")
    .regex(/^[a-z_]+$/, "Lowercase letters and underscores only"),
  action: z
    .string()
    .min(1, "Action is required")
    .regex(/^[a-z_]+$/, "Lowercase letters and underscores only"),
});

const updatePermissionSchema = createPermissionSchema.extend({
  id: z.string().min(1),
});

type CreatePermissionFormData = z.infer<typeof createPermissionSchema>;
type UpdatePermissionFormData = z.infer<typeof updatePermissionSchema>;

interface PermissionsListProps {
  permissionsByResource: Record<string, Permission[]>;
  canManagePermissions: boolean;
}

export function PermissionsList({
  permissionsByResource,
  canManagePermissions,
}: PermissionsListProps) {
  const [permissions, setPermissions] =
    React.useState<Record<string, Permission[]>>(permissionsByResource);
  const [loading, setLoading] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingPermission, setEditingPermission] =
    React.useState<Permission | null>(null);
  const [deletingPermission, setDeletingPermission] =
    React.useState<Permission | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const createForm = useForm<CreatePermissionFormData>({
    resolver: zodResolver(createPermissionSchema),
    defaultValues: {
      name: "",
      description: "",
      resource: "",
      action: "",
    },
  });

  const editForm = useForm<UpdatePermissionFormData>({
    resolver: zodResolver(updatePermissionSchema),
    defaultValues: {
      id: "",
      name: "",
      description: "",
      resource: "",
      action: "",
    },
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await listPermissionsAction();
      if (result.success && result.data) {
        const grouped = result.data.permissions.reduce(
          (acc, perm) => {
            if (!acc[perm.resource]) {
              acc[perm.resource] = [];
            }
            acc[perm.resource].push(perm);
            return acc;
          },
          {} as Record<string, Permission[]>,
        );
        setPermissions(grouped);
      }
    } catch (error) {
      toast.error("Failed to refresh permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = async (data: CreatePermissionFormData) => {
    setSubmitting(true);
    try {
      const result = await createPermissionAction({
        name: data.name,
        description: data.description,
        resource: data.resource,
        action: data.action,
      });

      if (result.success) {
        toast.success("Permission created successfully");
        setCreateOpen(false);
        createForm.reset();
        await refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to create permission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (data: UpdatePermissionFormData) => {
    setSubmitting(true);
    try {
      const result = await updatePermissionAction({
        id: data.id,
        name: data.name,
        description: data.description,
        resource: data.resource,
        action: data.action,
      });

      if (result.success) {
        toast.success("Permission updated successfully");
        setEditingPermission(null);
        editForm.reset();
        await refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to update permission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPermission) return;

    setSubmitting(true);
    try {
      const result = await deletePermissionAction({ id: deletingPermission.id });

      if (result.success) {
        toast.success("Permission deleted successfully");
        setDeletingPermission(null);
        await refresh();
      } else {
        toast.error(result.error || "Failed to delete permission");
      }
    } catch {
      toast.error("Failed to delete permission");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (permission: Permission) => {
    setEditingPermission(permission);
    editForm.reset({
      id: permission.id,
      name: permission.name,
      description: permission.description || "",
      resource: permission.resource,
      action: permission.action,
    });
  };

  // Count total permissions
  const totalPermissions = Object.values(permissions).reduce(
    (sum, perms) => sum + perms.length,
    0,
  );

  if (!canManagePermissions) {
    return null;
  }

  return (
    <>
      <Card className="mx-4 lg:mx-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyIcon className="size-5" />
              Permissions
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {totalPermissions} permissions across {Object.keys(permissions).length}{" "}
              resources.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCwIcon
                className={loading ? "size-4 animate-spin" : "size-4"}
              />
              <span className="hidden lg:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Add permission
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(permissions).map(([resource, perms]) => (
            <div key={resource}>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                {resource}
                <Badge variant="outline">{perms.length}</Badge>
              </h3>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr className="border-b">
                      <th className="px-3 py-2 font-medium">Permission</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perms.map((perm) => (
                      <tr key={perm.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {perm.name}
                          </code>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {perm.description || "-"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(perm)}
                            >
                              <PencilIcon className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingPermission(perm)}
                              className="text-destructive hover:text-destructive"
                            >
                              <TrashIcon className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create Permission Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Permission</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resource">Resource</Label>
              <Input
                id="resource"
                placeholder="e.g., admin, staff, room"
                {...createForm.register("resource")}
              />
              {createForm.formState.errors.resource && (
                <p className="text-sm font-medium text-destructive">
                  {createForm.formState.errors.resource.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Input
                id="action"
                placeholder="e.g., create, read, update, delete"
                {...createForm.register("action")}
              />
              {createForm.formState.errors.action && (
                <p className="text-sm font-medium text-destructive">
                  {createForm.formState.errors.action.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="perm-name">Permission Name (auto-generated)</Label>
              <Input
                id="perm-name"
                value={`${createForm.watch("resource") || "resource"}.${createForm.watch("action") || "action"}`}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what this permission does..."
                {...createForm.register("description")}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Permission"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Permission Dialog */}
      <Dialog
        open={!!editingPermission}
        onOpenChange={(open) => !open && setEditingPermission(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-resource">Resource</Label>
              <Input
                id="edit-resource"
                {...editForm.register("resource")}
              />
              {editForm.formState.errors.resource && (
                <p className="text-sm font-medium text-destructive">
                  {editForm.formState.errors.resource.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-action">Action</Label>
              <Input
                id="edit-action"
                {...editForm.register("action")}
              />
              {editForm.formState.errors.action && (
                <p className="text-sm font-medium text-destructive">
                  {editForm.formState.errors.action.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-perm-name">Permission Name</Label>
              <Input
                id="edit-perm-name"
                {...editForm.register("name")}
                disabled
                className="bg-muted"
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingPermission(null)}
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

      {/* Delete Permission Dialog */}
      <Dialog
        open={!!deletingPermission}
        onOpenChange={(open) => !open && setDeletingPermission(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Permission</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the permission "
            {deletingPermission?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingPermission(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete Permission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
