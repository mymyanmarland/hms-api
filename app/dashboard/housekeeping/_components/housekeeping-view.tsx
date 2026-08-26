"use client";

import * as React from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Loader2,
  BedIcon,
  UsersIcon,
  SparklesIcon,
  WrenchIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoomStatusDialog } from "./room-status-dialog";
import { RoomStatusCard } from "./room-status-card";
import type { HousekeepingSummary } from "@/app/actions/room-status";

// ============================================
// TYPES
// ============================================

type RoomStatus = "AVAILABLE" | "OCCUPIED" | "DIRTY" | "CLEANING" | "MAINTENANCE" | "OUT_OF_ORDER";

type RoomData = {
  id: string;
  number: string;
  floor: number;
  status: RoomStatus;
  notes: string | null;
  roomType: {
    name: string;
    basePrice: string;
    bedConfig: string | null;
  };
  currentGuest: {
    bookingId: string;
    guestName: string;
    checkOutDate: string | null;
  } | null;
};

type RoomsResponse = {
  data?: {
    rooms: RoomData[];
    summary: HousekeepingSummary;
  };
  success: boolean;
  error?: string;
};

type StatusFilter = "ALL" | "AVAILABLE" | "OCCUPIED" | "DIRTY" | "CLEANING" | "MAINTENANCE" | "OUT_OF_ORDER";

type StatusConfig = {
  label: string;
  color: string;
  icon: React.ElementType;
  description: string;
};

const STATUS_CONFIGS: Record<RoomStatus, StatusConfig> = {
  AVAILABLE: {
    label: "Available",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300 dark:border-emerald-500/30",
    icon: CheckCircleIcon,
    description: "Ready for new guests",
  },
  OCCUPIED: {
    label: "Occupied",
    color: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300 dark:border-blue-500/30",
    icon: UsersIcon,
    description: "Guest currently checked in",
  },
  DIRTY: {
    label: "Dirty",
    color: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300 dark:border-amber-500/30",
    icon: SparklesIcon,
    description: "Needs cleaning after checkout",
  },
  CLEANING: {
    label: "Cleaning",
    color: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300 dark:border-violet-500/30",
    icon: Loader2,
    description: "Housekeeping in progress",
  },
  MAINTENANCE: {
    label: "Maintenance",
    color: "bg-orange-500/15 text-orange-800 border-orange-500/30 dark:text-orange-300 dark:border-orange-500/30",
    icon: WrenchIcon,
    description: "Under repair",
  },
  OUT_OF_ORDER: {
    label: "Out of Order",
    color: "bg-red-500/15 text-red-800 border-red-500/30 dark:text-red-300 dark:border-red-500/30",
    icon: AlertTriangleIcon,
    description: "Out of service",
  },
};

const STATUS_TAB_ITEMS: Array<{ value: StatusFilter; label: string; icon: React.ElementType }> = [
  { value: "ALL", label: "All Rooms", icon: BedIcon },
  { value: "DIRTY", label: "Dirty", icon: SparklesIcon },
  { value: "CLEANING", label: "Cleaning", icon: Loader2 },
  { value: "MAINTENANCE", label: "Maintenance", icon: WrenchIcon },
  { value: "AVAILABLE", label: "Available", icon: CheckCircleIcon },
];

// ============================================
// HELPERS
// ============================================

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load rooms");
  }
  return res.json() as Promise<RoomsResponse>;
};

// ============================================
// SUMMARY CARDS
// ============================================

function SummaryCard({
  label,
  count,
  config,
  isLoading,
  onClick,
}: {
  label: string;
  count: number;
  config: StatusConfig;
  isLoading: boolean;
  onClick?: () => void;
}) {
  const Icon = config.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-1.5 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/50 disabled:opacity-50"
    >
      <div className="flex w-full items-center justify-between">
        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", config.color)}>
          <Icon className="mr-1 inline size-3" />
          {config.label}
        </span>
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-12" />
      ) : (
        <span className="text-3xl font-bold tabular-nums">{count}</span>
      )}
      <span className="text-xs text-muted-foreground">{config.description}</span>
    </button>
  );
}

// ============================================
// ROOM GRID
// ============================================

function RoomGrid({
  rooms,
  isLoading,
  onUpdateStatus,
}: {
  rooms: RoomData[];
  isLoading: boolean;
  onUpdateStatus: (roomId: string, status: RoomStatus) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card py-16 text-center">
        <BedIcon className="size-10 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">No rooms match the filter</p>
        <p className="text-xs text-muted-foreground">Try changing the status filter above</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rooms.map((room) => (
        <RoomStatusCard
          key={room.id}
          room={room}
          onUpdateStatus={onUpdateStatus}
        />
      ))}
    </div>
  );
}

// ============================================
// MAIN VIEW COMPONENT
// ============================================

export function HousekeepingView() {
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [floorFilter, setFloorFilter] = React.useState<string>("ALL");
  const [selectedRoom, setSelectedRoom] = React.useState<RoomData | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const { data, error, isLoading, mutate } = useSWR<RoomsResponse>(
    `/api/rooms`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 30000 },
  );

  const rooms = data?.data?.rooms ?? [];
  const summary = data?.data?.summary;

  // Get unique floors from rooms
  const floors = React.useMemo(() => {
    const floorSet = new Set(rooms.map((r) => r.floor));
    return Array.from(floorSet).sort((a, b) => a - b);
  }, [rooms]);

  // Filter rooms
  const filteredRooms = React.useMemo(() => {
    return rooms.filter((room) => {
      if (statusFilter !== "ALL" && room.status !== statusFilter) return false;
      if (floorFilter !== "ALL" && room.floor !== Number(floorFilter)) return false;
      return true;
    });
  }, [rooms, statusFilter, floorFilter]);

  // Handle status update
  const handleUpdateStatus = async (roomId: string, newStatus: RoomStatus) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ roomId, status: newStatus }),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.error ?? "Failed to update room status");
        return;
      }

      toast.success("Room status updated successfully");
      await mutate();
      setSelectedRoom(null);
    } catch {
      toast.error("Failed to update room status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFilterChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Housekeeping</h1>
          <p className="text-sm text-muted-foreground">
            Manage room statuses and track housekeeping tasks
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCard
            label="Total"
            count={summary.totalRooms}
            config={STATUS_CONFIGS["AVAILABLE"]}
            isLoading={isLoading}
          />
          <SummaryCard
            label="Available"
            count={summary.available}
            config={STATUS_CONFIGS["AVAILABLE"]}
            isLoading={isLoading}
            onClick={() => setStatusFilter("AVAILABLE")}
          />
          <SummaryCard
            label="Occupied"
            count={summary.occupied}
            config={STATUS_CONFIGS["OCCUPIED"]}
            isLoading={isLoading}
            onClick={() => setStatusFilter("OCCUPIED")}
          />
          <SummaryCard
            label="Dirty"
            count={summary.dirty}
            config={STATUS_CONFIGS["DIRTY"]}
            isLoading={isLoading}
            onClick={() => setStatusFilter("DIRTY")}
          />
          <SummaryCard
            label="Cleaning"
            count={summary.cleaning}
            config={STATUS_CONFIGS["CLEANING"]}
            isLoading={isLoading}
            onClick={() => setStatusFilter("CLEANING")}
          />
          <SummaryCard
            label="Out of Service"
            count={summary.outOfService}
            config={STATUS_CONFIGS["MAINTENANCE"]}
            isLoading={isLoading}
            onClick={() => setStatusFilter("MAINTENANCE")}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={statusFilter} onValueChange={handleFilterChange} className="w-auto">
          <TabsList>
            {STATUS_TAB_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger key={item.value} value={item.value} className="gap-1.5">
                  <Icon className="size-3.5" />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <Select value={floorFilter} onValueChange={setFloorFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Floors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Floors</SelectItem>
            {floors.map((floor) => (
              <SelectItem key={floor} value={String(floor)}>
                Floor {floor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredRooms.length} room{filteredRooms.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void mutate()}
            disabled={isLoading}
          >
            <RefreshCwIcon className={cn("mr-1.5 size-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {(error as Error).message ?? "Failed to load rooms"}
        </div>
      )}

      {/* Room Grid */}
      <RoomGrid
        rooms={filteredRooms}
        isLoading={isLoading}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Status Update Dialog */}
      {selectedRoom && (
        <RoomStatusDialog
          room={selectedRoom}
          open={!!selectedRoom}
          onOpenChange={(open) => {
            if (!open) setSelectedRoom(null);
          }}
          onConfirm={async (newStatus) => {
            await handleUpdateStatus(selectedRoom.id, newStatus);
          }}
          isLoading={isUpdating}
        />
      )}
    </div>
  );
}
