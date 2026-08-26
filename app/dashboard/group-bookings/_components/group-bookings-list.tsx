"use client";

import * as React from "react";
import useSWR from "swr";
import {
  PlusIcon,
  RefreshCwIcon,
  UsersIcon,
  BadgeDollarSignIcon,
  CalendarIcon,
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
import { CreateGroupDialog } from "./create-group-dialog";
import { GroupBookingDetailsSheet } from "./group-booking-details-sheet";

type GroupBookingRow = {
  id: string;
  groupName: string;
  groupType: "CORPORATE" | "WEDDING" | "TOUR" | "SPORTS" | "GOVERNMENT" | "OTHER";
  groupCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactCompany: string | null;
  roomsBlocked: number;
  roomsConfirmed: number;
  discountPercent: string;
  depositRequired: boolean;
  depositAmount: string | null;
  depositReceived: string;
  status: string;
  createdAt: string;
};

type GroupBookingsListResponse = {
  data: {
    data: GroupBookingRow[];
    nextCursor: string | null;
    total: number;
  };
  success: boolean;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load group bookings");
  }
  return res.json() as Promise<GroupBookingsListResponse>;
};

const GROUP_TYPE_LABELS: Record<GroupBookingRow["groupType"], string> = {
  CORPORATE: "Corporate",
  WEDDING: "Wedding",
  TOUR: "Tour",
  SPORTS: "Sports",
  GOVERNMENT: "Government",
  OTHER: "Other",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export function GroupBookingsList() {
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [groupType, setGroupType] = React.useState<string>("ALL");
  const [status, setStatus] = React.useState<string>("ALL");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedGroup, setSelectedGroup] = React.useState<GroupBookingRow | null>(null);

  React.useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (groupType !== "ALL") params.set("groupType", groupType);
  if (status !== "ALL") params.set("status", status);
  const queryString = params.toString();

  const { data, error, isLoading, mutate, isValidating } = useSWR<GroupBookingsListResponse>(
    `/api/group-bookings${queryString ? `?${queryString}` : ""}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const groups = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UsersIcon className="size-5" />
              Group Bookings
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage block reservations for corporate events, weddings, and tour groups
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {total} {total === 1 ? "group" : "groups"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void mutate()}
              disabled={isValidating}
            >
              <RefreshCwIcon className={isValidating ? "size-4 animate-spin" : "size-4"} />
              <span className="hidden lg:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              New Group
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, code, or contact..."
              className="sm:max-w-sm"
            />
            <div className="flex items-center gap-2">
              <Select value={groupType} onValueChange={setGroupType}>
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="CORPORATE">Corporate</SelectItem>
                    <SelectItem value="WEDDING">Wedding</SelectItem>
                    <SelectItem value="TOUR">Tour</SelectItem>
                    <SelectItem value="SPORTS">Sports</SelectItem>
                    <SelectItem value="GOVERNMENT">Government</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger size="sm" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {(error as Error).message ?? "Failed to load group bookings."}
            </div>
          ) : isLoading ? (
            <GroupBookingsSkeleton />
          ) : groups.length === 0 ? (
            <EmptyState onCreate={() => setCreateOpen(true)} />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr className="border-b">
                    <th className="px-3 py-2 font-medium">Group</th>
                    <th className="px-3 py-2 font-medium">Contact</th>
                    <th className="px-3 py-2 font-medium">Rooms</th>
                    <th className="px-3 py-2 font-medium">Discount</th>
                    <th className="px-3 py-2 font-medium">Deposit</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr
                      key={group.id}
                      className="cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
                      onClick={() => setSelectedGroup(group)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{group.groupName}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {GROUP_TYPE_LABELS[group.groupType]}
                            </Badge>
                            <span className="font-mono">{group.groupCode}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span>{group.contactName}</span>
                          <span className="text-xs text-muted-foreground">
                            {group.contactEmail}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span>
                            {group.roomsConfirmed} / {group.roomsBlocked}
                          </span>
                          <span className="text-xs text-muted-foreground">confirmed</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {Number(group.discountPercent) > 0 ? (
                          <Badge variant="secondary">
                            <BadgeDollarSignIcon className="size-3 mr-1" />
                            {group.discountPercent}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {group.depositRequired ? (
                          <div className="flex flex-col">
                            <span className="text-sm">
                              ${Number(group.depositReceived).toFixed(0)} / $
                              {Number(group.depositAmount ?? 0).toFixed(0)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={STATUS_VARIANT[group.status] ?? "outline"}>
                          {group.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGroup(group);
                            }}
                          >
                            View
                          </Button>
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

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          toast.success("Group booking created");
          void mutate();
        }}
      />

      {selectedGroup && (
        <GroupBookingDetailsSheet
          groupId={selectedGroup.id}
          open={!!selectedGroup}
          onOpenChange={(open) => {
            if (!open) setSelectedGroup(null);
          }}
          onSuccess={() => {
            void mutate();
            setSelectedGroup(null);
          }}
        />
      )}
    </>
  );
}

function GroupBookingsSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex flex-col">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b px-3 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="ml-auto h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
      <UsersIcon className="size-8 text-muted-foreground" />
      <div className="text-sm text-muted-foreground">
        No group bookings found.
      </div>
      <Button size="sm" variant="outline" onClick={onCreate}>
        Create your first group booking
      </Button>
    </div>
  );
}
