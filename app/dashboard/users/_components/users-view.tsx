"use client";

import * as React from "react";
import useSWR from "swr";
import {
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
  UserIcon,
  UserX2Icon,
} from "lucide-react";
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

import { EditUserDialog } from "./edit-user-dialog";
import { DeactivateUserDialog } from "./deactivate-user-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  isActive: boolean;
  sessionCount: number;
  hasGuestProfile: boolean;
  guestId: string | null;
  phone: string | null;
  isVip: boolean;
  loyaltyPoints: number;
};

export type UsersListResponse = {
  data: UserRow[];
  nextCursor: string | null;
  total: number;
};

type ListKey = ["/api/users", string, string, string | undefined];

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load users");
  }
  return res.json() as Promise<UsersListResponse>;
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
  return ["/api/users", qs, status, cursor];
}

export function UsersView() {
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [deactivating, setDeactivating] = React.useState<UserRow | null>(null);
  const [deleting, setDeleting] = React.useState<UserRow | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, error, isLoading, mutate, isValidating } = useSWR<UsersListResponse>(
    buildKey(search, status, undefined),
    ([path, qs]) => fetcher(qs ? `${path}?${qs}` : path),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const users = data?.data ?? [];
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
              <UserIcon className="size-5" /> Users
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Customers who registered through the HMS mobile app.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {total} {total === 1 ? "user" : "users"}
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
              {(error as Error).message ?? "Failed to load users."}
            </div>
          ) : isLoading ? (
            <UsersTableSkeleton />
          ) : users.length === 0 ? (
            <EmptyState />
          ) : (
            <UsersTable
              users={users}
              onEdit={setEditing}
              onDeactivate={setDeactivating}
              onDelete={setDeleting}
            />
          )}
        </CardContent>
      </Card>

      {editing ? (
        <EditUserDialog
          user={editing}
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSuccess={() => {
            toast.success("User updated");
            refresh();
          }}
        />
      ) : null}

      {deactivating ? (
        <DeactivateUserDialog
          user={deactivating}
          open={!!deactivating}
          onOpenChange={(open) => {
            if (!open) setDeactivating(null);
          }}
          onSuccess={() => {
            toast.success("Sessions revoked");
            refresh();
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteUserDialog
          user={deleting}
          open={!!deleting}
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          onSuccess={() => {
            toast.success("User deleted");
            refresh();
          }}
        />
      ) : null}
    </>
  );
}

function UsersTable({
  users,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  users: UserRow[];
  onEdit: (user: UserRow) => void;
  onDeactivate: (user: UserRow) => void;
  onDelete: (user: UserRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left">
          <tr className="border-b">
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Email</th>
            <th className="px-3 py-2 font-medium">Phone</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">VIP</th>
            <th className="px-3 py-2 font-medium">Loyalty</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b last:border-b-0">
              <td className="px-3 py-2">
                <div className="font-medium">{user.name}</div>
                {user.emailVerified ? null : (
                  <div className="text-xs text-muted-foreground">
                    Email pending
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{user.email}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {user.phone ?? "—"}
              </td>
              <td className="px-3 py-2">
                {user.isActive ? (
                  <Badge variant="secondary">Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </td>
              <td className="px-3 py-2">
                {user.isVip ? (
                  <Badge variant="default" className="bg-primary">VIP</Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {user.loyaltyPoints}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(user)}
                  >
                    <PencilIcon />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeactivate(user)}
                  >
                    <UserX2Icon />
                    Revoke sessions
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(user)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2Icon />
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

function UsersTableSkeleton() {
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
      <UserX2Icon className="size-8 text-muted-foreground" />
      <div className="text-sm text-muted-foreground">
        No users match your filters.
      </div>
    </div>
  );
}
