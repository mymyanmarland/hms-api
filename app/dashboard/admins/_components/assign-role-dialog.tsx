"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

import {
  assignRoleToStaffAction,
  removeRoleFromStaffAction,
  getAssignableRolesAction,
} from "@/app/actions/roles";
import type { AdminRow } from "./admins-view";

const assignRoleSchema = z.object({
  roleId: z.string().min(1, "Please select a role"),
});

type AssignRoleFormData = z.infer<typeof assignRoleSchema>;

type Role = {
  id: string;
  name: string;
  description: string | null;
  isSuperRole: boolean;
  permissionCount: number;
};

interface AssignRoleDialogProps {
  admin: AdminRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignRoleDialog({
  admin,
  open,
  onOpenChange,
  onSuccess,
}: AssignRoleDialogProps) {
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  const form = useForm<AssignRoleFormData>({
    resolver: zodResolver(assignRoleSchema),
    defaultValues: {
      roleId: admin.roleId || "",
    },
  });

  React.useEffect(() => {
    if (open) {
      setLoading(true);
      getAssignableRolesAction()
        .then((result) => {
          if (result.success && result.data) {
            setRoles(result.data.roles);
          } else {
            toast.error(result.error || "Failed to load roles");
            setRoles([]);
          }
        })
        .catch(() => {
          toast.error("Failed to load roles");
          setRoles([]);
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleAssign = async (data: AssignRoleFormData) => {
    setSubmitting(true);
    try {
      const result = await assignRoleToStaffAction({
        staffId: admin.id,
        roleId: data.roleId,
      });

      if (result.success) {
        toast.success("Role assigned successfully");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error || "Failed to assign role");
      }
    } catch {
      toast.error("Failed to assign role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const result = await removeRoleFromStaffAction({
        staffId: admin.id,
      });

      if (result.success) {
        toast.success("Role removed successfully");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error || "Failed to remove role");
      }
    } catch {
      toast.error("Failed to remove role");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Role to {admin.name}</DialogTitle>
          <DialogDescription>
            Select a role to assign to this admin. The role determines what
            permissions this admin has.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {admin.roleName && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Current Role</p>
                    <div className="flex items-center gap-2 mt-1">
                      {admin.isSuperAdmin ? (
                        <Badge variant="default" className="bg-primary">
                          Super Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{admin.roleName}</Badge>
                      )}
                    </div>
                  </div>
                  {!admin.isSuperAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemove}
                      disabled={removing}
                    >
                      {removing ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        "Remove"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={form.handleSubmit(handleAssign)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roleId">Select Role</Label>
                <Controller
                  name="roleId"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a role..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{role.name}</span>
                                {role.description && (
                                  <span className="text-xs text-muted-foreground">
                                    {role.description}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {role.permissionCount} permissions
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.roleId && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.roleId.message}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    "Assign Role"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
