"use client";

import * as React from "react";
import useSWR from "swr";
import { PlusIcon, RefreshCwIcon, ShieldUserIcon, UserX2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { InviteAdminDialog } from "./invite-admin-dialog";
import { EditAdminDialog } from "./edit-admin-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { DeactivateAdminDialog } from "./deactivate-admin-dialog";
import { DeleteAdminDialog } from "./delete-admin-dialog";
import { AssignRoleDialog } from "./assign-role-dialog";

export type AdminRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  emailVerified: boolean;
  lastActiveAt: string | null;
  roleId: string | null;
  roleName: string | null;
  roleDescription: string | null;
  isSuperAdmin: boolean;
};

export type AdminsListResponse = {
  data: AdminRow[];
  nextCursor: string | null;
  total: number;
};

type ListKey = ["/api/admins", string, string, string | undefined];

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load admins");
  }
  return res.json() as Promise<AdminsListResponse>;
};

function buildKey(
  search: string,
  status: "all" | "active" | "inactive",
  cursor: string | undefined,
): ListKey {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status !== "all") params.set("status", status);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return ["/api/admins", qs, status, cursor];
}

export function AdminsView() {
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AdminRow | null>(null);
  const [resetting, setResetting] = React.useState<AdminRow | null>(null);
  const [deactivating, setDeactivating] = React.useState<AdminRow | null>(null);
  const [deleting, setDeleting] = React.useState<AdminRow | null>(null);
  const [assigningRole, setAssigningRole] = React.useState<AdminRow | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, error, isLoading, mutate, isValidating } = useSWR<AdminsListResponse>(
    buildKey(search, status, undefined),
    ([path, qs]) => fetcher(qs ? `${path}?${qs}` : path),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const admins = data?.data ?? [];
  const total = data?.total ?? 0;

  const refresh = React.useCallback(() => {
    void mutate();
  }, [mutate]);

  return (
    <>
      <Card className="mx-4 lg:mx-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldUserIcon className="size-5" /> Admins
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage who can access the HMS admin dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {total} {total === 1 ? "admin" : "admins"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isValidating}
              aria-label="Refresh"
            >
              <RefreshCwIcon
                className={isValidating ? "size-4 animate-spin" : "size-4"}
              />
              <span className="hidden lg:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <PlusIcon />
              Invite admin
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name or email"
              className="sm:max-w-sm"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as "all" | "active" | "inactive")
                }
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {(error as Error).message ?? "Failed to load admins."}
            </div>
          ) : isLoading ? (
            <AdminsTableSkeleton />
          ) : admins.length === 0 ? (
            <EmptyState onInvite={() => setInviteOpen(true)} />
          ) : (
            <AdminsTable
              admins={admins}
              onEdit={setEditing}
              onReset={setResetting}
              onDeactivate={setDeactivating}
              onDelete={setDeleting}
              onAssignRole={setAssigningRole}
            />
          )}
        </CardContent>
      </Card>

      <InviteAdminDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={() => {
          toast.success("Admin invited");
          refresh();
        }}
      />

      {editing ? (
        <EditAdminDialog
          admin={editing}
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSuccess={() => {
            toast.success("Admin updated");
            refresh();
          }}
        />
      ) : null}

      {resetting ? (
        <ResetPasswordDialog
          admin={resetting}
          open={!!resetting}
          onOpenChange={(open) => {
            if (!open) setResetting(null);
          }}
        />
      ) : null}

      {deactivating ? (
        <DeactivateAdminDialog
          admin={deactivating}
          open={!!deactivating}
          onOpenChange={(open) => {
            if (!open) setDeactivating(null);
          }}
          onSuccess={() => {
            toast.success("Admin deactivated");
            refresh();
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteAdminDialog
          admin={deleting}
          open={!!deleting}
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          onSuccess={() => {
            toast.success("Admin deleted");
            refresh();
          }}
        />
      ) : null}

      {assigningRole ? (
        <AssignRoleDialog
          admin={assigningRole}
          open={!!assigningRole}
          onOpenChange={(open) => {
            if (!open) setAssigningRole(null);
          }}
          onSuccess={() => {
            toast.success("Role assigned successfully");
            refresh();
          }}
        />
      ) : null}
    </>
  );
}

function AdminsTable({
  admins,
  onEdit,
  onReset,
  onDeactivate,
  onDelete,
  onAssignRole,
}: {
  admins: AdminRow[];
  onEdit: (admin: AdminRow) => void;
  onReset: (admin: AdminRow) => void;
  onDeactivate: (admin: AdminRow) => void;
  onDelete: (admin: AdminRow) => void;
  onAssignRole: (admin: AdminRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left">
          <tr className="border-b">
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Email</th>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Verified</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id} className="border-b last:border-b-0">
              <td className="px-3 py-2">
                <div className="font-medium">{admin.name}</div>
                {admin.phone ? (
                  <div className="text-xs text-muted-foreground">
                    {admin.phone}
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{admin.email}</td>
              <td className="px-3 py-2">
                {admin.isSuperAdmin ? (
                  <Badge variant="default" className="bg-primary">Super Admin</Badge>
                ) : admin.roleName ? (
                  <Badge variant="secondary">{admin.roleName}</Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">No role</span>
                )}
              </td>
              <td className="px-3 py-2">
                {admin.isActive ? (
                  <Badge variant="secondary">Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {admin.emailVerified ? "Yes" : "Pending"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {new Date(admin.createdAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAssignRole(admin)}
                  >
                    Assign role
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(admin)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReset(admin)}
                  >
                    Reset password
                  </Button>
                  {admin.isActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeactivate(admin)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeactivate(admin)}
                    >
                      Reactivate
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(admin)}
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex flex-col">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b px-3 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="ml-auto h-8 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
      <UserX2Icon className="size-8 text-muted-foreground" />
      <div className="text-sm text-muted-foreground">
        No admins match your filters.
      </div>
      <Button size="sm" variant="outline" onClick={onInvite}>
        Invite your first admin
      </Button>
    </div>
  );
}